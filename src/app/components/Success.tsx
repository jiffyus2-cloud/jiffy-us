import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
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
          // Esperamos a que el webhook de Stripe actualice el status en Firestore
          const orderRef = doc(db, 'orders', orderId);
          const POLL_INTERVAL = 2000;
          const MAX_ATTEMPTS = 15; // 30 segundos máximo

          let paid = false;
          for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const orderSnap = await getDoc(orderRef);
            if (orderSnap.exists() && orderSnap.data()?.status === 'paid') {
              paid = true;

              // Enviamos correos de confirmación (sin bloquear el flujo si fallan)
              try {
                const orderData = { id: orderId, ...orderSnap.data() };
                await Promise.all([
                  sendOrderConfirmationToCustomer(orderData),
                  sendNewOrderNotificationToOwner(orderData),
                ]);
              } catch (emailError) {
                console.error('Error al enviar correos de confirmación:', emailError);
              }
              break;
            }
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
          }

          if (!paid) {
            throw new Error(t('error.verifyPayment'));
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