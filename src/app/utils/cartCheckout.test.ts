import { describe, it, expect } from 'vitest';
import { buildCheckoutWrites, newCheckoutGroupId, type CheckoutContext } from './cartCheckout';
import { computeCartTotals, priceOrder } from './cartPricing';
import { describeOrderPayment } from './orderPaymentSummary';
import { INITIAL_STORE_CONFIG } from './storeConfigState';

const P = INITIAL_STORE_CONFIG.prices;
const album46 = {
  productType: 'album',
  customization: { size: 'Cuadrado 20x20 cm', coverType: 'Papel' },
  pages: Array.from({ length: 46 }, () => ({ images: [] })),
};
const wall = { productType: 'calendar', customization: { type: 'wall-notes', year: 2027 } };

const ctx: CheckoutContext = {
  shippingAddress: { name: 'Ana', city: 'Bogotá' },
  billingAddress: { name: 'Ana' },
  groupId: 'cg_test',
  code: { code: 'HOLA', discount: 20000 },
  shippingMethod: 'national',
  pickupLocation: null,
  shippingCity: 'Bogotá',
  paymentMethod: 'card',
  now: '2026-11-26T00:00:00.000Z',
};

function build(lines: Array<{ orderId: string; order: any; quantity: number }>, code = ctx.code) {
  const priced = lines.map(l => ({ orderId: l.orderId, quantity: l.quantity, pricing: priceOrder(l.order, P, l.quantity) }));
  const totals = computeCartTotals(priced.map(l => ({ orderId: l.orderId, lineTotal: l.pricing.lineTotal })), {
    discounts: { active: true, percentage: 10 }, codeDiscount: code?.discount, shipping: P.shippingNational,
  });
  return { totals, writes: buildCheckoutWrites(priced, totals, { ...ctx, code }) };
}

describe('buildCheckoutWrites', () => {
  it('varios pedidos: mismo grupo, envío y código solo en el principal, partes que suman el total', () => {
    const { totals, writes } = build([
      { orderId: 'a', order: album46, quantity: 2 },
      { orderId: 'b', order: wall, quantity: 1 },
    ]);
    expect(writes.map(w => w.data.checkoutGroup.id)).toEqual(['cg_test', 'cg_test']);
    expect(writes[0].data.checkoutGroup.orderIds).toEqual(['a', 'b']);
    expect(writes.map(w => w.data.discountCode)).toEqual(['HOLA', null]);
    expect(writes.map(w => w.data.paymentSummary.shipping)).toEqual([P.shippingNational, 0]);
    expect(writes.reduce((n, w) => n + w.data.total, 0)).toBe(totals.total);
    expect(writes.every(w => w.data.status === 'pending_payment')).toBe(true);
    expect(writes[0].data.quantity).toBe(2);
    expect(writes[0].data.paymentSummary.group.total).toBe(totals.total);
  });

  it('un solo pedido no lleva grupo y conserva el formato de siempre', () => {
    const { totals, writes } = build([{ orderId: 'a', order: album46, quantity: 1 }], null);
    expect(writes).toHaveLength(1);
    expect(writes[0].data.checkoutGroup).toBeNull();
    expect(writes[0].data.paymentSummary.group).toBeNull();
    expect(writes[0].data.total).toBe(totals.total);
    expect(writes[0].data.discountCode).toBeNull();
  });

  it('el panel del dueño describe bien una parte de la compra', () => {
    const { writes } = build([
      { orderId: 'a', order: album46, quantity: 2 },
      { orderId: 'b', order: wall, quantity: 1 },
    ]);
    const lead = describeOrderPayment({ ...writes[0].data });
    expect(lead.group).toEqual({ index: 0, count: 2, total: writes[0].data.paymentSummary.group.total });
    expect(lead.lines[0].label).toMatch(/^2 × Álbum/);
    // 6 páginas extra por copia, dos copias
    expect(lead.lines[1].amount).toBe(6 * P.albumExtra20x20 * 2);
    const second = describeOrderPayment({ ...writes[1].data });
    expect(second.headline).toMatch(/compra de 2 productos/);
    expect(second.lines.at(-1)!.label).toMatch(/pedido principal/);
  });

  it('genera ids de compra distintos', () => {
    expect(newCheckoutGroupId()).not.toBe(newCheckoutGroupId());
  });
});
