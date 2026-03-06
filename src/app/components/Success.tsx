import { useNavigate } from 'react-router';
import { CheckCircle } from 'lucide-react';

export default function Success() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <CheckCircle className="w-20 h-20 text-green-500 mb-6" />
      <h1 className="text-4xl font-bold mb-4">¡Pedido realizado con éxito!</h1>
      <p className="text-xl text-gray-600 mb-8 max-w-md">
        Tu pedido ha sido guardado y estamos procesando tus fotos. 
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
    </div>
  );
}
