// ============================================================================
// Resumen de lo pagado en un pedido (panel del dueño)
// ============================================================================
// El checkout guarda en el pedido una «foto» del desglose que vio el cliente
// (`paymentSummary`): producto, páginas, envío, descuentos y total. Así el panel
// muestra exactamente lo que se cobró aunque después cambien los precios.
//
// Los pedidos anteriores a ese cambio no tienen la foto: para ellos se arma la
// descripción con lo que sí quedó guardado (tamaño, tapa, páginas, dirección,
// código de descuento y total) SIN inventar importes por línea.
// ============================================================================

import { ALBUM_BASE_PAGES } from './albumPricing';

export type ShippingMethod = 'pickup' | 'cali' | 'national' | 'unknown';

/** Lo que el checkout guarda en `order.paymentSummary`. */
export interface PaymentSummarySnapshot {
  version: 1;
  productKind: 'album' | 'calendar' | 'other';
  productLabel: string;
  size?: string | null;
  coverType?: string | null;
  quantity: number;
  pages?: number | null;
  extraPages?: number | null;
  /** Precio del producto sin páginas extra (álbum: sus 40 páginas base). */
  basePrice: number;
  extraPagePrice?: number | null;
  extraPagesCost?: number | null;
  subtotal: number;
  storeDiscountPct?: number | null;
  storeDiscount: number;
  discountCode?: string | null;
  codeDiscount: number;
  shippingMethod: ShippingMethod;
  pickupLocation?: string | null;
  shippingCity?: string | null;
  shipping: number;
  total: number;
  paymentMethod?: 'card' | 'nequi' | null;
  createdAt: string;
  /**
   * Compra de varios productos (carrito). Los importes de arriba son la parte
   * de ESTE pedido; aquí van los de la compra entera.
   */
  group?: PaymentGroupSummary | null;
}

export interface PaymentGroupSummary {
  id: string;
  /** Posición de este pedido en la compra (0 = principal: lleva el envío y el código). */
  index: number;
  count: number;
  orderIds: string[];
  subtotal: number;
  storeDiscount: number;
  codeDiscount: number;
  shipping: number;
  total: number;
}

export interface PaymentLine {
  label: string;
  /** Detalle secundario (p. ej. «12 × $3.750»). */
  detail?: string;
  /** Importe en COP; negativo para descuentos. Ausente si no se conoce. */
  amount?: number;
}

export interface PaymentDescription {
  /** Una frase con todo lo pagado, para leer de un vistazo. */
  headline: string;
  lines: PaymentLine[];
  total: number;
  paymentMethodLabel: string | null;
  /** true cuando viene de la foto del checkout (importes exactos por línea). */
  exact: boolean;
  /** Si el pedido se pagó junto con otros (carrito). */
  group: { index: number; count: number; total: number } | null;
}

const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

/** «Cuadrado 20x20 cm» → «20x20 cm»; deja tal cual cualquier otro formato. */
export function shortSize(size: string | null | undefined): string {
  const s = String(size ?? '').trim();
  const m = s.match(/(\d{2})\s*x\s*(\d{2})/i);
  return m ? `${m[1]}x${m[2]} cm` : s;
}

function productKindOf(order: any): 'album' | 'calendar' | 'other' {
  const p = String(order?.productType || order?.product?.type || order?.product?.id || order?.product?.name || '').toLowerCase();
  if (p.includes('calendar') || p.includes('calendario') || order?.customization?.year !== undefined || order?.customization?.imagesPerMonth !== undefined) return 'calendar';
  if (p.includes('album') || p.includes('photobook')) return 'album';
  return 'other';
}

function coverLabel(coverType: string | null | undefined): string | null {
  if (!coverType) return null;
  return coverType === 'Tela' ? 'tapa en tela' : coverType === 'Papel' ? 'tapa dura impresa' : `tapa ${coverType.toLowerCase()}`;
}

function calendarLabel(order: any): string {
  const f = String(order?.customization?.type || order?.customization?.format || order?.customization?.size || '').toLowerCase();
  const kind = f.includes('wall') || f.includes('pared') ? 'Calendario de pared' : f.includes('desk') || f.includes('escritorio') ? 'Calendario de escritorio' : 'Calendario';
  const year = order?.customization?.year;
  return year ? `${kind} ${year}` : kind;
}

function pickupName(address: string): string | null {
  const m = address.match(/Recogida en punto:\s*(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Envío deducido de la dirección guardada (pedidos sin foto del checkout). */
export function shippingFromAddress(order: any): { method: ShippingMethod; pickupLocation: string | null; city: string | null } {
  const addr = order?.shippingAddress;
  if (!addr) return { method: 'unknown', pickupLocation: null, city: null };
  const pickup = pickupName(String(addr.address || ''));
  if (pickup) return { method: 'pickup', pickupLocation: pickup, city: addr.city || null };
  const city = String(addr.city || '').trim();
  if (!city) return { method: 'unknown', pickupLocation: null, city: null };
  return { method: city.toLowerCase().includes('cali') ? 'cali' : 'national', pickupLocation: null, city };
}

function shippingLabel(method: ShippingMethod, pickupLocation?: string | null, city?: string | null): string {
  switch (method) {
    case 'pickup': return `Recoge en punto${pickupLocation ? `: ${pickupLocation}` : ''} (sin envío)`;
    case 'cali': return `Envío local a ${city || 'Cali'}`;
    case 'national': return `Envío nacional${city ? ` a ${city}` : ''}`;
    default: return 'Envío sin datos';
  }
}

export function paymentMethodLabel(order: any): string | null {
  const m = order?.paymentMethod || order?.paymentSummary?.paymentMethod;
  if (m === 'nequi') return 'Nequi';
  if (m === 'stripe' || m === 'card') return 'Tarjeta (Stripe)';
  if (m === 'prueba') return 'Pago de prueba';
  if (order?.stripeSessionId || order?.stripePaymentIntentId) return 'Tarjeta (Stripe)';
  return null;
}

function pagesOf(order: any): number {
  return order?.pages?.length || order?.photos?.length || 0;
}

function fromSnapshot(order: any, s: PaymentSummarySnapshot): PaymentDescription {
  const lines: PaymentLine[] = [];
  const qty = s.quantity || 1;
  const cover = coverLabel(s.coverType);
  const product = [s.productLabel, s.size ? shortSize(s.size) : null, cover].filter(Boolean).join(' · ');

  lines.push({
    label: `${qty} × ${product}`,
    detail: s.productKind === 'album' && s.pages
      ? `${s.pages} páginas (${Math.min(s.pages, ALBUM_BASE_PAGES)} incluidas)`
      : undefined,
    amount: s.basePrice * qty,
  });
  if (s.extraPages && s.extraPages > 0) {
    // `extraPagesCost` ya incluye todas las copias.
    lines.push({
      label: `${s.extraPages} páginas extra${qty > 1 ? ' por copia' : ''}`,
      detail: s.extraPagePrice
        ? `${qty > 1 ? `${qty} copias × ` : ''}${s.extraPages} × ${cop(s.extraPagePrice)}`
        : undefined,
      amount: s.extraPagesCost ?? undefined,
    });
  }
  if (s.storeDiscount > 0) {
    lines.push({ label: `Descuento de la tienda${s.storeDiscountPct ? ` (${s.storeDiscountPct}%)` : ''}`, amount: -s.storeDiscount });
  }
  if (s.codeDiscount > 0) {
    lines.push({ label: `Código de descuento${s.discountCode ? ` ${s.discountCode}` : ''}`, amount: -s.codeDiscount });
  }
  const g = s.group && s.group.count > 1 ? s.group : null;
  // En una compra conjunta el envío se cobra una vez, en el pedido principal.
  lines.push({
    label: g && g.index > 0
      ? 'Envío: incluido en el pedido principal de la compra'
      : shippingLabel(s.shippingMethod, s.pickupLocation, s.shippingCity),
    amount: s.shipping,
  });

  const headline = buildHeadline(qty, product, s.extraPages ?? 0, s.pages ?? null, s.shippingMethod, s.pickupLocation, s.shippingCity, s.shipping);
  return {
    headline: g ? `${headline} · compra de ${g.count} productos` : headline,
    lines,
    total: Number(order?.total ?? s.total) || 0,
    paymentMethodLabel: paymentMethodLabel(order),
    exact: true,
    group: g ? { index: g.index, count: g.count, total: g.total } : null,
  };
}

function buildHeadline(
  qty: number, product: string, extraPages: number, pages: number | null,
  method: ShippingMethod, pickupLocation?: string | null, city?: string | null, shipping?: number,
): string {
  const parts = [`${qty} × ${product}`];
  if (pages) parts.push(extraPages > 0 ? `${pages} págs (${extraPages} extra)` : `${pages} págs`);
  if (method === 'pickup') parts.push(`recoge en ${pickupLocation || 'punto'}`);
  else if (method === 'cali' || method === 'national') {
    parts.push(`${shipping === 0 ? 'envío gratis' : 'con envío'} ${method === 'cali' ? 'local' : 'nacional'}${city ? ` (${city})` : ''}`);
  }
  return parts.join(' · ');
}

function reconstructed(order: any): PaymentDescription {
  const kind = productKindOf(order);
  const c = order?.customization || {};
  const lines: PaymentLine[] = [];
  const pages = kind === 'album' ? pagesOf(order) : 0;
  const extra = Math.max(0, pages - ALBUM_BASE_PAGES);

  let product: string;
  if (kind === 'album') {
    const cover = coverLabel(c.coverType || c.material);
    product = ['Álbum', c.size ? shortSize(c.size) : null, cover].filter(Boolean).join(' · ');
  } else if (kind === 'calendar') {
    product = calendarLabel(order);
  } else {
    product = String(order?.product?.name || order?.productType || 'Producto');
  }

  lines.push({ label: `1 × ${product}`, detail: pages ? `${pages} páginas (${Math.min(pages, ALBUM_BASE_PAGES)} incluidas)` : undefined });
  if (extra > 0) lines.push({ label: `${extra} páginas extra` });

  const code = order?.discountCode;
  const codeAmount = Number(order?.discountCodeAmount) || 0;
  if (code) lines.push({ label: `Código de descuento ${code}`, amount: codeAmount > 0 ? -codeAmount : undefined });

  const ship = shippingFromAddress(order);
  lines.push({ label: shippingLabel(ship.method, ship.pickupLocation, ship.city), amount: ship.method === 'pickup' ? 0 : undefined });

  return {
    headline: buildHeadline(1, product, extra, pages || null, ship.method, ship.pickupLocation, ship.city),
    lines,
    total: Number(order?.total) || 0,
    paymentMethodLabel: paymentMethodLabel(order),
    exact: false,
    group: null,
  };
}

/** Descripción clara de lo que pagó el cliente en este pedido. */
export function describeOrderPayment(order: any): PaymentDescription {
  const s = order?.paymentSummary;
  if (s && s.version === 1) return fromSnapshot(order, s as PaymentSummarySnapshot);
  return reconstructed(order);
}

/** Texto plano de una línea con su importe, para listas y exportaciones. */
export function formatPaymentLine(line: PaymentLine): string {
  if (line.amount === undefined) return line.label;
  if (line.amount === 0) return `${line.label}: $0`;
  return `${line.label}: ${line.amount < 0 ? '−' : ''}${cop(Math.abs(line.amount))}`;
}
