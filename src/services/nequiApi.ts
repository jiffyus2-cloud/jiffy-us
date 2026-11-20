import { auth } from '../lib/firebase';

/**
 * Cobro con Nequi (pagos push de Nequi Conecta) a través del backend.
 *
 * El navegador nunca habla con Nequi: pide al backend que envíe la
 * notificación al celular del cliente y luego pregunta cada pocos segundos si
 * ya la aceptó. El backend es quien marca el pedido como pagado.
 */

export type NequiState = 'pending' | 'paid' | 'rejected' | 'expired' | 'failed' | 'cancelled';

export interface NequiPaymentView {
  state: NequiState;
  /** Celular enmascarado, p. ej. "300 *** 4567". */
  phone: string;
  value: number;
  createdAt: string;
  orderStatus: string;
}

function backendUrl(): string {
  return (
    import.meta.env.VITE_BACKEND_URL ||
    'https://jiffy-backend-938778636106.europe-west1.run.app'
  );
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Inicia sesión para pagar.');

  const response = await fetch(`${backendUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || 'No pudimos comunicarnos con Nequi. Inténtalo de nuevo.');
  }
  return data as T;
}

/** ¿Está activo el cobro con Nequi? Ante cualquier fallo, no. */
export async function isNequiEnabled(): Promise<boolean> {
  try {
    const response = await fetch(`${backendUrl()}/nequi/config`);
    if (!response.ok) return false;
    const data = await response.json();
    return data?.enabled === true;
  } catch {
    return false;
  }
}

export const createNequiPayment = (orderId: string, phone: string) =>
  post<NequiPaymentView>('/nequi/create-payment', { orderId, phone });

export const getNequiPaymentStatus = (orderId: string) =>
  post<NequiPaymentView>('/nequi/status', { orderId });

export const cancelNequiPayment = (orderId: string) =>
  post<NequiPaymentView>('/nequi/cancel', { orderId });

/** 10 dígitos empezando por 3 (acepta +57, espacios y guiones). */
export function normalizeNequiPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('57')) digits = digits.slice(2);
  return /^3\d{9}$/.test(digits) ? digits : null;
}
