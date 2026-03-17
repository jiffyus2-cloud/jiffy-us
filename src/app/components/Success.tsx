import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth'; // IMPORTANTE: Traemos el hook de Auth

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation(); // Usamos useLocation en lugar de window.location
  const { user } = useAuth();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const hasAttempted = useRef(false);

  useEffect(() => {
    // 1. ESPERAR A FIREBASE AUTH: Si la sesión aún no ha cargado al regresar, pausamos aquí.
    if (!user) return;

    // 2. EVITAR DOBLE EJECUCIÓN: React Strict Mode dispara useEffect 2 veces. Esto lo evita.
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    // 3. LEER URL DE FORMA SEGURA:
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get('session_id');
    const orderId = localStorage.getItem('pending_order_id');

    if (sessionId && orderId) {
      const confirmPayment = async () => {
        try {
          // Llamada a tu backend en la nube
          const response = await fetch('https://jiffy-backend-938778636106.europe-west1.run.app/stripe/confirm-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId, orderId }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'No se pudo verificar el pago con el servidor.');
          }

          // El pago fue verificado por el backend. Ahora actualizamos Firestore.
          try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, { 
              status: 'paid',
              updatedAt: new Date().toISOString() 
            });
            // Si llega a esta línea, Firebase se actualizó exitosamente
          } catch (firestoreError) {
            console.error("Error de permisos en Firestore:", firestoreError);
            throw new Error("El pago se validó, pero falló la conexión con tu cuenta. Contacta a soporte.");
          }

          // Si todo va bien, limpiamos el ID del localStorage
          localStorage.removeItem('pending_order_id');
          setVerificationError(null);
        } catch (error: any) {
          console.error('Error al confirmar pago:', error);
          setVerificationError(error.message || 'Ocurrió un error al confirmar tu pedido.');
          localStorage.removeItem('pending_order_id');
        } finally {
          setIsVerifying(false);
        }
      };

      confirmPayment();
    } else {
      setIsVerifying(false);
    }
  }, [user, location.search]); // Dependencias clave para re-ejecutar cuando el 'user' cargue

  const VerificationStatus = () => {
    if (isVerifying) {
      return (
        <div className="flex items-center justify-center gap-3 text-lg text-gray-600 mb-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Verificando tu pago con Stripe...</span>
        </div>
      );
    }
    return null; 
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <CheckCircle className="w-20 h-20 text-green-500 mb-6" />
      <h1 className="text-4xl font-bold mb-4">¡Pedido realizado con éxito!</h1>
      <p className="text-xl text-gray-600 mb-8 max-w-md">
        Tu pedido ha sido guardado y estamos procesando tu creación. 
        Recibirás un correo de confirmación en breve.
      </p>

      <VerificationStatus />

      {verificationError && (
        <div className="mt-4 mb-8 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-3 max-w-md text-left animate-in zoom-in-95">
          <AlertTriangle className="w-8 h-8 flex-shrink-0" />
          <div>
            <p className="font-bold">¡Atención!</p>
            <p className="text-sm">{verificationError}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          disabled={isVerifying}
          className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Ir a mis pedidos
        </button>
        <button
          onClick={() => navigate('/')}
          disabled={isVerifying}
          className="bg-white border border-gray-300 text-black px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}