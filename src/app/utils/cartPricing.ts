// ============================================================================
// Precios del carrito
// ============================================================================
// Cada producto del carrito es su propio pedido (`orders/{id}`). Aquí se calcula
// lo que cuesta cada uno (mismas fórmulas que tenía el checkout de un solo
// producto) y el total de la compra: el envío se cobra UNA vez, los descuentos
// se aplican sobre el subtotal de todo el carrito y luego se reparten entre los
// pedidos para que cada uno guarde su parte. La suma de las partes es siempre,
// al peso, el total que paga el cliente.
//
// Puro (sin Firebase ni React): testeado en cartPricing.test.ts.
// ============================================================================

import type { StoreConfig } from './storeConfigState';
import { getAlbumPrice, getExtraPagesCost } from './albumPricing';
import { MAX_ORDER_COPIES, clampCopies } from './orderPaymentSummary';

type Prices = StoreConfig['prices'];
type Discounts = StoreConfig['discounts'];

export type CartProductKind = 'album' | 'calendar' | 'other';

/** Copias máximas de un mismo producto: el mismo límite que el resto de la app. */
export const MAX_ITEM_QUANTITY = MAX_ORDER_COPIES;
/** Productos distintos máximos en una compra (el backend acepta 20 pedidos por pago). */
export const MAX_CART_ITEMS = 20;

export const clampQuantity = clampCopies;

export function orderProductKind(order: any): CartProductKind {
  const p = String(order?.productType || order?.product?.type || order?.product?.id || order?.product?.name || '').toLowerCase();
  if (
    p.includes('calendar') || p.includes('calendario') ||
    order?.customization?.year !== undefined || order?.customization?.imagesPerMonth !== undefined
  ) return 'calendar';
  if (p.includes('album') || p.includes('photobook')) return 'album';
  return 'other';
}

export function isTelaOrder(order: any): boolean {
  return order?.customization?.coverType === 'Tela' || order?.customization?.material === 'Tela';
}

function isWallCalendar(order: any): boolean {
  const f = String(order?.customization?.type || order?.customization?.format || order?.customization?.size || '').toLowerCase();
  return f.includes('wall') || f.includes('pared');
}

/** Nombre corto del producto para listas y para Stripe. */
export function orderProductLabel(order: any): string {
  const kind = orderProductKind(order);
  if (kind === 'album') return 'Álbum';
  if (kind === 'calendar') return isWallCalendar(order) ? 'Calendario de pared' : 'Calendario de escritorio';
  return String(order?.product?.name || 'Producto');
}

export interface CartItemPricing {
  kind: CartProductKind;
  label: string;
  size: string | null;
  coverType: string | null;
  quantity: number;
  /** Álbum: páginas del diseño. */
  pages: number | null;
  /** Álbum: páginas por encima de las base (por copia). */
  extraPages: number | null;
  /** Precio del producto sin páginas extra (álbum: sus 40 páginas base), por copia. */
  unitBase: number;
  extraPagePrice: number | null;
  /** Coste de las páginas extra, por copia. */
  extraPagesCost: number | null;
  /** Precio de una copia. */
  unitPrice: number;
  /** unitPrice × quantity. */
  lineTotal: number;
}

/** Precio de un pedido del carrito con los precios actuales de la tienda. */
export function priceOrder(order: any, prices: Prices, quantity = 1): CartItemPricing {
  const kind = orderProductKind(order);
  const qty = clampQuantity(quantity);
  const size = order?.customization?.size ?? null;

  if (kind === 'album') {
    const pages = order?.pages?.length || order?.photos?.length || 0;
    const tela = isTelaOrder(order);
    const price = getAlbumPrice(prices, size, tela);
    const extra = getExtraPagesCost(price, pages);
    const unitPrice = price.base + extra.cost;
    return {
      kind, label: 'Álbum', size,
      coverType: order?.customization?.coverType || order?.customization?.material || null,
      quantity: qty, pages, extraPages: extra.count,
      unitBase: price.base, extraPagePrice: price.extraPage, extraPagesCost: extra.cost,
      unitPrice, lineTotal: unitPrice * qty,
    };
  }

  const unitPrice = kind === 'calendar'
    ? (isWallCalendar(order) ? prices.calendarWall : prices.calendarDesk)
    : Number(order?.product?.basePrice || order?.product?.price || 0) || 0;

  return {
    kind, label: orderProductLabel(order), size,
    coverType: null, quantity: qty, pages: null, extraPages: null,
    unitBase: unitPrice, extraPagePrice: null, extraPagesCost: null,
    unitPrice, lineTotal: unitPrice * qty,
  };
}

export type ShippingChoice = { pickup: true } | { pickup: false; city: string };

/** Envío de toda la compra (se cobra una vez). `null` = aún sin ciudad. */
export function shippingCost(choice: ShippingChoice, prices: Prices): number | null {
  if (choice.pickup) return 0;
  const city = choice.city.trim().toLowerCase();
  if (city === '') return null;
  return city.includes('cali') ? prices.shippingCali : prices.shippingNational;
}

/**
 * Reparte `amount` (pesos enteros) en proporción a `weights` por el método del
 * mayor resto: la suma es exacta y ninguna parte supera su peso si
 * `amount <= sum(weights)`.
 */
export function prorate(amount: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  const amt = Math.max(0, Math.round(amount));
  if (weights.length === 0) return [];
  if (total <= 0) return weights.map((_, i) => (i === 0 ? amt : 0));

  const exact = weights.map(w => (amt * Math.max(0, w)) / total);
  const shares = exact.map(Math.floor);
  let left = amt - shares.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) shares[order[k].i]++;
  return shares;
}

/**
 * Promoción «el 3.º a mitad de precio». Se cuentan UNIDADES (las copias de un
 * mismo producto cuentan): por cada 3 unidades, la más barata sale al 50 %.
 * Con 6 unidades salen 2 a mitad de precio, siempre las más baratas.
 *
 * Devuelve el descuento de cada línea (pesos enteros) en el orden recibido.
 * Si hay empate de precio se descuenta primero la línea que va antes.
 */
export function thirdItemHalfOffShares(
  items: Array<{ unitPrice: number; quantity: number }>,
): number[] {
  const units: Array<{ line: number; price: number }> = [];
  items.forEach((item, line) => {
    const price = Math.max(0, Math.round(item.unitPrice));
    const qty = Math.max(0, Math.floor(item.quantity));
    for (let k = 0; k < qty; k++) units.push({ line, price });
  });

  const shares = items.map(() => 0);
  const free = Math.floor(units.length / 3);
  if (free === 0) return shares;

  units.sort((a, b) => a.price - b.price || a.line - b.line);
  for (let k = 0; k < free; k++) shares[units[k].line] += Math.round(units[k].price / 2);
  return shares;
}

export interface OrderAllocation {
  orderId: string;
  subtotal: number;
  /** Parte de la promoción «3.º a mitad de precio» que corresponde a este pedido. */
  promoDiscount: number;
  storeDiscount: number;
  codeDiscount: number;
  shipping: number;
  total: number;
}

export interface CartTotals {
  subtotal: number;
  /** Promoción «3.º a mitad de precio» (0 si está apagada o no aplica). */
  promoDiscount: number;
  /** Unidades que salieron a mitad de precio. */
  promoUnits: number;
  storeDiscountPct: number | null;
  storeDiscount: number;
  codeDiscount: number;
  /** null mientras no se sepa la ciudad (cuenta como 0 en el total). */
  shipping: number | null;
  total: number;
  /** Parte de cada pedido. El primero (principal) lleva el envío. */
  allocations: OrderAllocation[];
}

/**
 * Una línea del carrito. Sin `unitPrice`/`quantity` cuenta como una sola
 * unidad de `lineTotal` (para la promoción del 3.º a mitad de precio).
 */
export interface CartTotalsItem {
  orderId: string;
  lineTotal: number;
  unitPrice?: number;
  quantity?: number;
}

/** Línea del carrito → lo que necesita `computeCartTotals`. */
export function cartTotalsItem(orderId: string, pricing: CartItemPricing): CartTotalsItem {
  return { orderId, lineTotal: pricing.lineTotal, unitPrice: pricing.unitPrice, quantity: pricing.quantity };
}

/**
 * Total de la compra. Orden de los descuentos: primero la promoción del 3.º a
 * mitad de precio (rebaja productos concretos), luego el % de la tienda sobre
 * lo que queda y por último el código.
 */
export function computeCartTotals(
  items: CartTotalsItem[],
  opts: { discounts: Discounts; codeDiscount?: number; shipping: number | null },
): CartTotals {
  const lineTotals = items.map(i => Math.max(0, Math.round(i.lineTotal)));
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);

  const promoShares = opts.discounts.thirdItemHalfOff
    ? thirdItemHalfOffShares(items.map((item, i) => (
        item.unitPrice != null && item.quantity != null
          ? { unitPrice: item.unitPrice, quantity: item.quantity }
          : { unitPrice: lineTotals[i], quantity: 1 }
      ))).map((d, i) => Math.min(d, lineTotals[i]))
    : items.map(() => 0);
  const promoDiscount = promoShares.reduce((a, b) => a + b, 0);
  const promoUnits = opts.discounts.thirdItemHalfOff
    ? Math.floor(items.reduce((n, item) => n + (item.unitPrice != null && item.quantity != null ? Math.max(0, Math.floor(item.quantity)) : 1), 0) / 3)
    : 0;
  const afterPromo = lineTotals.map((t, i) => t - promoShares[i]);
  const promoSubtotal = subtotal - promoDiscount;

  const pct = opts.discounts.active && opts.discounts.percentage > 0 ? opts.discounts.percentage : null;
  const storeDiscount = pct ? Math.min(promoSubtotal, Math.round(promoSubtotal * (pct / 100))) : 0;
  // El código lo calcula el backend sobre el subtotal; nunca deja el total en negativo.
  const codeDiscount = Math.min(promoSubtotal - storeDiscount, Math.max(0, Math.round(opts.codeDiscount ?? 0)));
  const shipping = opts.shipping;
  const total = promoSubtotal - storeDiscount - codeDiscount + (shipping ?? 0);

  const storeShares = prorate(storeDiscount, afterPromo);
  const afterStore = afterPromo.map((t, i) => t - storeShares[i]);
  const codeShares = prorate(codeDiscount, afterStore);

  const allocations = items.map((item, i) => {
    const ship = i === 0 ? (shipping ?? 0) : 0;
    return {
      orderId: item.orderId,
      subtotal: lineTotals[i],
      promoDiscount: promoShares[i],
      storeDiscount: storeShares[i],
      codeDiscount: codeShares[i],
      shipping: ship,
      total: lineTotals[i] - promoShares[i] - storeShares[i] - codeShares[i] + ship,
    };
  });

  return {
    subtotal, promoDiscount, promoUnits, storeDiscountPct: pct, storeDiscount, codeDiscount, shipping, total, allocations,
  };
}

/**
 * Cuántas unidades más hacen falta para que la promoción del 3.º a mitad de
 * precio aplique otra vez (1 o 2), o 0 si justo acaba de aplicar.
 */
export function unitsToNextHalfOff(totalUnits: number): number {
  const r = Math.max(0, Math.floor(totalUnits)) % 3;
  return r === 0 ? 0 : 3 - r;
}

/** Estados en los que un pedido puede estar (o seguir) en el carrito. */
export const CARTABLE_STATUSES: readonly string[] = ['draft', 'saved_draft', 'pending_payment'];

export function isCartable(order: any): boolean {
  return !!order && CARTABLE_STATUSES.includes(order.status) && order.productType !== 'custom-album';
}
