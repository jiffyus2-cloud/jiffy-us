// ============================================================================
// Lo que el checkout escribe en cada pedido del carrito antes de cobrar
// ============================================================================
// Puro: recibe los pedidos con su precio y el total de la compra (cartPricing)
// y devuelve, por pedido, los campos a guardar. Testeado en cartCheckout.test.ts.
// ============================================================================

import type { CartItemPricing, CartTotals } from './cartPricing';
import type { PaymentSummarySnapshot, ShippingMethod } from './orderPaymentSummary';

export interface CheckoutLineInput {
  orderId: string;
  quantity: number;
  pricing: CartItemPricing;
}

export interface CheckoutContext {
  shippingAddress: Record<string, any>;
  billingAddress: Record<string, any>;
  /** Id de la compra; solo se usa si hay más de un pedido. */
  groupId: string;
  code: { code: string; discount: number } | null;
  shippingMethod: ShippingMethod;
  pickupLocation: string | null;
  shippingCity: string | null;
  paymentMethod: 'card' | 'nequi';
  now: string;
}

export interface CheckoutWrite {
  orderId: string;
  data: Record<string, any>;
}

export function newCheckoutGroupId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `cg_${Date.now().toString(36)}_${rand}`;
}

export function buildCheckoutWrites(
  lines: CheckoutLineInput[],
  totals: CartTotals,
  ctx: CheckoutContext,
): CheckoutWrite[] {
  const multi = lines.length > 1;
  const orderIds = lines.map(l => l.orderId);

  return lines.map((line, i) => {
    const alloc = totals.allocations[i];
    const p = line.pricing;
    const isLead = i === 0;

    const summary: PaymentSummarySnapshot = {
      version: 1,
      productKind: p.kind,
      productLabel: p.label,
      size: p.size,
      coverType: p.coverType,
      quantity: line.quantity,
      pages: p.pages,
      extraPages: p.extraPages,
      basePrice: p.unitBase,
      extraPagePrice: p.extraPagePrice,
      // Por copia, como `basePrice`: «Lo pagado» los multiplica por `quantity`.
      extraPagesCost: p.extraPagesCost,
      subtotal: alloc.subtotal,
      storeDiscountPct: totals.storeDiscountPct,
      storeDiscount: alloc.storeDiscount,
      discountCode: ctx.code?.code ?? null,
      codeDiscount: alloc.codeDiscount,
      shippingMethod: ctx.shippingMethod,
      pickupLocation: ctx.pickupLocation,
      shippingCity: ctx.shippingCity,
      shipping: alloc.shipping,
      total: alloc.total,
      paymentMethod: ctx.paymentMethod,
      createdAt: ctx.now,
      group: multi
        ? {
            id: ctx.groupId,
            index: i,
            count: lines.length,
            orderIds,
            subtotal: totals.subtotal,
            storeDiscount: totals.storeDiscount,
            codeDiscount: totals.codeDiscount,
            shipping: totals.shipping ?? 0,
            total: totals.total,
          }
        : null,
    };

    return {
      orderId: line.orderId,
      data: {
        shippingAddress: ctx.shippingAddress,
        billingAddress: ctx.billingAddress,
        total: alloc.total,
        status: 'pending_payment',
        quantity: line.quantity,
        // El backend exige que todos los pedidos de un pago compartan grupo.
        // Un pedido que se paga solo se desengancha de compras anteriores.
        checkoutGroup: multi
          ? { id: ctx.groupId, orderIds, leadOrderId: orderIds[0], count: lines.length, total: totals.total, createdAt: ctx.now }
          : null,
        // El webhook canjea el código leyendo el pedido principal: solo ahí.
        discountCode: isLead && ctx.code ? ctx.code.code : null,
        discountCodeAmount: isLead && ctx.code ? totals.codeDiscount : 0,
        paymentSummary: summary,
      },
    };
  });
}
