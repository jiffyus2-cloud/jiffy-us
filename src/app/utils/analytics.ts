// Eventos para Google Tag Manager (GTM-PMBKN6NS, cargado en index.html).
// Marketing crea en GTM un activador "Evento personalizado" con el nombre del
// evento (p. ej. `registro_completado`) y lee los parámetros como variables de
// la capa de datos. Los botones llevan además un id y `data-gtm-action` únicos
// por si prefieren activadores de clic (TRACKING_IDS).

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export const TRACKING_IDS = {
  /** Botón final del formulario de registro. */
  registerSubmit: 'btn-registro-final',
  /** Botón final de compra con tarjeta (redirige a Stripe). */
  checkoutStripe: 'btn-compra-stripe',
  /** Botón final de compra con Nequi. */
  checkoutNequi: 'btn-compra-nequi',
} as const;

export const TRACKING_EVENTS = {
  registerCompleted: 'registro_completado',
  stripeCheckoutStarted: 'compra_stripe_inicio',
  /** Pago confirmado (Stripe o Nequi) en /success. Lleva valor y moneda. */
  purchaseCompleted: 'compra_completada',
} as const;

/** Parámetro de /success que dispara una compra de prueba (sin pedido real). */
export const PURCHASE_TEST_PARAM = 'prueba_compra';

export interface PurchaseInfo {
  transactionId: string;
  value: number;
  currency?: string;
  paymentMethod: 'stripe' | 'nequi' | 'prueba';
  productType?: string | null;
  test?: boolean;
}

/**
 * Compra completada. Formato de comercio electrónico de GA4 (`ecommerce`)
 * más los mismos datos en el nivel superior para variables simples de GTM.
 */
export function trackPurchase(p: PurchaseInfo): void {
  const currency = p.currency || 'COP';
  const productType = p.productType || null;
  try {
    // GA4 recomienda vaciar el objeto ecommerce anterior antes de uno nuevo.
    getDataLayer().push({ ecommerce: null });
  } catch {
    // ignorar
  }
  trackEvent(TRACKING_EVENTS.purchaseCompleted, {
    transaction_id: p.transactionId,
    value: p.value,
    currency,
    payment_method: p.paymentMethod,
    product_type: productType,
    test: !!p.test,
    ecommerce: {
      transaction_id: p.transactionId,
      value: p.value,
      currency,
      items: [{ item_id: productType || 'pedido', item_name: productType || 'pedido', price: p.value, quantity: 1 }],
    },
  });
}

function getDataLayer(): Record<string, unknown>[] {
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

/** Envía un evento a la capa de datos. Nunca lanza: la analítica no debe romper la app. */
export function trackEvent(event: string, params: Record<string, unknown> = {}): void {
  try {
    getDataLayer().push({ event, ...params });
  } catch {
    // ignorar
  }
}

/**
 * Envía un evento y ejecuta `then` cuando GTM termina de disparar sus etiquetas,
 * o tras `timeoutMs` si GTM no está cargado (bloqueador de anuncios, etc.).
 * Útil justo antes de salir de la página (redirección a Stripe).
 */
export function trackEventThen(
  event: string,
  params: Record<string, unknown>,
  then: () => void,
  timeoutMs = 1000,
): void {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    then();
  };
  try {
    getDataLayer().push({ event, ...params, eventCallback: go, eventTimeout: timeoutMs });
  } catch {
    // ignorar
  }
  window.setTimeout(go, timeoutMs);
}
