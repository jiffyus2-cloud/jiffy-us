import { useEffect, useRef, useState } from 'react';
import { Loader2, Smartphone, XCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  cancelNequiPayment,
  getNequiPaymentStatus,
  type NequiPaymentView,
} from '../../services/nequiApi';

/** Cada cuánto se pregunta al backend mientras el cobro está pendiente. */
const POLL_MS = 4000;
/** A partir de aquí se ofrece reenviar, sin dejar de consultar. */
const SLOW_AFTER_MS = 5 * 60 * 1000;

interface Props {
  orderId: string;
  initial: NequiPaymentView;
  onPaid: () => void;
  /** Reenviar la notificación (crea un cobro nuevo y anula el anterior). */
  onResend: () => Promise<void>;
  /** Cerrar el modal y volver al checkout (p. ej. para pagar con tarjeta). */
  onClose: () => void;
}

const FINAL_MESSAGES: Record<string, string> = {
  rejected: 'Rechazaste el pago en Nequi o fue cancelado.',
  expired: 'La notificación de Nequi venció sin respuesta.',
  failed: 'Nequi no pudo completar el pago.',
  cancelled: 'Anulaste el cobro de Nequi.',
};

export default function NequiPaymentModal({ orderId, initial, onPaid, onResend, onClose }: Props) {
  const [payment, setPayment] = useState<NequiPaymentView>(initial);
  const [busy, setBusy] = useState<'cancel' | 'resend' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const paidHandled = useRef(false);

  // El cobro inicial puede cambiar si el padre reenvía la notificación.
  useEffect(() => { setPayment(initial); }, [initial]);

  useEffect(() => {
    if (payment.state !== 'pending') return;
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await getNequiPaymentStatus(orderId);
        if (!cancelled) { setPayment(next); setError(null); }
      } catch (err: any) {
        // Un fallo puntual de red no es un pago fallido: se sigue esperando.
        if (!cancelled) setError(err?.message || null);
      }
    };
    const id = window.setInterval(tick, POLL_MS);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { cancelled = true; window.clearInterval(id); window.clearInterval(clock); };
  }, [orderId, payment.state]);

  useEffect(() => {
    if (payment.state === 'paid' && !paidHandled.current) {
      paidHandled.current = true;
      onPaid();
    }
  }, [payment.state, onPaid]);

  const elapsed = Math.max(0, now - Date.parse(payment.createdAt || '') || 0);
  const isSlow = payment.state === 'pending' && elapsed > SLOW_AFTER_MS;

  const handleCancel = async () => {
    setBusy('cancel');
    setError(null);
    try {
      const next = await cancelNequiPayment(orderId);
      setPayment(next);
      if (next.state !== 'paid') onClose();
    } catch (err: any) {
      setError(err?.message || 'No pudimos anular el cobro.');
    } finally {
      setBusy(null);
    }
  };

  const handleResend = async () => {
    setBusy('resend');
    setError(null);
    try {
      await onResend();
    } catch (err: any) {
      setError(err?.message || 'No pudimos reenviar la notificación.');
    } finally {
      setBusy(null);
    }
  };

  const amount = `$${Number(payment.value || 0).toLocaleString('es-CO')} COP`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="nequi-modal-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {payment.state === 'pending' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#200020] text-white">
              <Smartphone className="h-7 w-7" />
            </div>
            <h3 id="nequi-modal-title" className="mb-2 text-center text-xl font-bold">Acepta el pago en tu Nequi</h3>
            <p className="mb-4 text-center text-sm text-gray-600">
              Enviamos una notificación al celular <span className="font-semibold text-gray-900">{payment.phone}</span> por <span className="font-semibold text-gray-900">{amount}</span>.
            </p>
            <ol className="mb-5 space-y-1.5 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
              <li>1. Abre la app Nequi en tu celular.</li>
              <li>2. Toca la notificación de pago de Jiffy Photos (también está en la campana de notificaciones de la app).</li>
              <li>3. Revisa el valor y acepta el pago.</li>
            </ol>
            <div className="mb-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Esperando la confirmación de Nequi…</span>
            </div>
            {isSlow && (
              <p className="mb-4 text-center text-xs text-amber-700">
                ¿No te llegó? Revisa que el número sea el de tu cuenta Nequi o reenvía la notificación.
              </p>
            )}
          </>
        )}

        {payment.state === 'paid' && (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-green-500" />
            <h3 id="nequi-modal-title" className="text-xl font-bold">¡Pago recibido!</h3>
            <p className="mt-1 text-sm text-gray-600">Te estamos llevando a la confirmación del pedido…</p>
          </div>
        )}

        {payment.state !== 'pending' && payment.state !== 'paid' && (
          <div className="mb-4 text-center">
            <XCircle className="mx-auto mb-3 h-14 w-14 text-red-500" />
            <h3 id="nequi-modal-title" className="text-xl font-bold">El pago no se completó</h3>
            <p className="mt-1 text-sm text-gray-600">{FINAL_MESSAGES[payment.state] || 'El pago no se completó.'} No se te cobró nada.</p>
          </div>
        )}

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">{error}</p>}

        {payment.state !== 'paid' && (
          <div className="flex flex-col gap-2">
            {(payment.state !== 'pending' || isSlow) && (
              <button
                type="button"
                onClick={handleResend}
                disabled={busy !== null}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 font-semibold text-white transition-colors hover:bg-gray-900 disabled:bg-gray-400"
              >
                {busy === 'resend' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reenviar notificación
              </button>
            )}
            {payment.state === 'pending' ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy !== null}
                className="w-full rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {busy === 'cancel' ? 'Anulando…' : 'Anular y elegir otro método'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={busy !== null}
                className="w-full rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Volver al checkout
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
