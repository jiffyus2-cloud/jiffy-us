import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { sendOrderConfirmationToCustomer, sendNewOrderNotificationToOwner } from '../../services/emailService';

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: isAuthLoading } = useAuth();
  const { t } = useLanguage();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const hasAttempted = useRef(false);

  useEffect(() => {
    // 1. ESPERAR A FIREBASE AUTH
    if (isAuthLoading) return;
    
    // 2. EVITAR DOBLE EJECUCIÓN
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    // 3. LEER URL DE FORMA SEGURA
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
            throw new Error(errorData.message || t('error.verifyPayment'));
          }

          // El pago fue verificado por el backend. Ahora actualizamos Firestore.
          const orderRef = doc(db, 'orders', orderId);
          try {
            await updateDoc(orderRef, {
              status: 'paid',
              updatedAt: new Date().toISOString()
            });
          } catch (firestoreError) {
            console.error("Error de permisos en Firestore:", firestoreError);
            throw new Error(t('error.firestoreConnection'));
          }

          // Enviamos correos de confirmación en paralelo (sin bloquear el flujo si fallan)
          try {
            const orderSnap = await getDoc(orderRef);
            if (orderSnap.exists()) {
              const orderData = { id: orderId, ...orderSnap.data() };
              await Promise.all([
                sendOrderConfirmationToCustomer(orderData),
                sendNewOrderNotificationToOwner(orderData),
              ]);
            }
          } catch (emailError) {
            console.error('Error al enviar correos de confirmación:', emailError);
            // No relanzamos el error — el pago ya fue confirmado correctamente
          }

          localStorage.removeItem('pending_order_id');
          setVerificationError(null);
          setCountdown(3);
        } catch (error: any) {
          console.error('Error al confirmar pago:', error);
          setVerificationError(error.message || t('error.confirmOrder'));
          localStorage.removeItem('pending_order_id');
        } finally {
          setIsVerifying(false);
        }
      };

      confirmPayment();
    } else {
      setIsVerifying(false);
    }
  }, [isAuthLoading, location.search, t]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { navigate('/dashboard'); return; }
    const timer = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  const VerificationStatus = () => {
    if (isVerifying) {
      return (
        <div className="flex items-center justify-center gap-3 text-lg text-gray-600 mb-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>{t('success.verifying')}</span>
        </div>
      );
    }
    return null; 
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <CheckCircle className="w-20 h-20 text-green-500 mb-6" />
      <h1 className="text-4xl font-bold mb-4">{t('success.title')}</h1>
      <p className="text-xl text-gray-600 mb-8 max-w-md">
        {t('success.subtitle')}
      </p>

      <VerificationStatus />

      {!isVerifying && !verificationError && countdown !== null && (
        <p className="text-sm text-gray-400 mb-6 -mt-4">
          Redirigiendo a tus pedidos en {countdown}...
        </p>
      )}

      {verificationError && (
        <div className="mt-4 mb-8 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-3 max-w-md text-left animate-in zoom-in-95">
          <AlertTriangle className="w-8 h-8 flex-shrink-0" />
          <div>
            <p className="font-bold">{t('common.attention')}</p>
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
          {t('success.myOrders')}
        </button>
        <button
          onClick={() => navigate('/')}
          disabled={isVerifying}
          className="bg-white border border-gray-300 text-black px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {t('success.backHome')}
        </button>
      </div>
    </div>
  );
}