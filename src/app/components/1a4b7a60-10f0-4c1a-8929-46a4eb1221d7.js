import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

export default function Success() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const orderId = localStorage.getItem('pending_order_id');

    // Solo intentamos confirmar si tenemos ambos IDs.
    if (sessionId && orderId) {
      const confirmPayment = async () => {
        try {
          // Llamada al backend para verificar la sesión de Stripe y actualizar Firebase.
          const response = await fetch('https://jiffy-backend-938778636106.europe-west1.run.app/stripe/confirm-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId, orderId }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'No se pudo verificar el pago.');
          }

          // Si todo va bien, limpiamos el ID del localStorage.
          localStorage.removeItem('pending_order_id');
          setVerificationError(null);
        } catch (error) {
          console.error('Error confirming payment:', error);
          let message = 'Ocurrió un error al confirmar tu pedido.';
          if (error instanceof Error) {
            message = error.message;
          }
          setVerificationError(message);
          // Limpiamos el ID también en caso de error para evitar reintentos en cada recarga.
          localStorage.removeItem('pending_order_id');
        } finally {
          setIsVerifying(false);
        }
      };

      confirmPayment();
    } else {
      // Si no hay IDs en la URL/localStorage, no hay nada que verificar.
      setIsVerifying(false);
    }
  }, [searchParams]);

  const VerificationStatus = () => {
    if (isVerifying) {
      return (
        <div className="flex items-center gap-3 text-lg text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Verificando tu pago...</span>
        </div>
      );
    }
    return null; // No mostramos nada si la verificación fue exitosa o no fue necesaria.
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <CheckCircle className="w-20 h-20 text-green-500 mb-6" />
      <h1 className="text-4xl font-bold mb-4">¡Pedido realizado con éxito!</h1>
      <p className="text-xl text-gray-600 mb-8 max-w-md">
        Tu pedido ha sido guardado y estamos procesando tu creación. 
        Recibirás un correo de confirmación en breve.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Ir a mis pedidos
        </button>
        <button
          onClick={() => navigate('/')}
          className="bg-white border border-gray-300 text-black px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Volver al inicio
        </button>
      </div>

      <div className="mt-12">
        <VerificationStatus />
        {verificationError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-3 max-w-md text-left">
            <AlertTriangle className="w-8 h-8 flex-shrink-0" />
            <div>
              <p className="font-bold">¡Atención!</p>
              <p className="text-sm">{verificationError} Tu pedido fue guardado, pero no pudimos actualizar el estado del pago automáticamente. Por favor, contacta a soporte si el problema persiste.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
