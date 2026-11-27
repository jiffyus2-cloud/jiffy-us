import { describe, it, expect } from 'vitest';
import { cartTotalsItem, computeCartTotals, priceOrder, thirdItemHalfOffShares, unitsToNextHalfOff } from './cartPricing';
import { buildCheckoutWrites } from './cartCheckout';
import { describeOrderPayment } from './orderPaymentSummary';
import { INITIAL_STORE_CONFIG } from './storeConfigState';

const P = INITIAL_STORE_CONFIG.prices;
const PROMO = { active: false, percentage: 10, thirdItemHalfOff: true };
const PROMO_PLUS10 = { active: true, percentage: 10, thirdItemHalfOff: true };
const OFF = { active: false, percentage: 10, thirdItemHalfOff: false };

const album = (pages = 40) => ({
  productType: 'album',
  customization: { size: 'Cuadrado 20x20 cm', coverType: 'Papel' },
  pages: Array.from({ length: pages }, (_, i) => ({ pageIndex: i, images: [] })),
});
const wall = { productType: 'calendar', customization: { type: 'wall-notes', year: 2027 } };
const desk = { productType: 'calendar', customization: { type: 'desk', year: 2027 } };

const item = (id: string, order: any, qty = 1) => cartTotalsItem(id, priceOrder(order, P, qty));

describe('thirdItemHalfOffShares', () => {
  it('con 2 unidades no aplica', () => {
    expect(thirdItemHalfOffShares([{ unitPrice: 100, quantity: 2 }])).toEqual([0]);
  });
  it('3 copias del mismo producto: una a mitad de precio', () => {
    expect(thirdItemHalfOffShares([{ unitPrice: 100000, quantity: 3 }])).toEqual([50000]);
  });
  it('3 productos distintos: el de menor precio', () => {
    expect(thirdItemHalfOffShares([
      { unitPrice: 150000, quantity: 1 },
      { unitPrice: 60000, quantity: 1 },
      { unitPrice: 80000, quantity: 1 },
    ])).toEqual([0, 30000, 0]);
  });
  it('2 copias + 1 producto más barato: el barato', () => {
    expect(thirdItemHalfOffShares([
      { unitPrice: 150000, quantity: 2 },
      { unitPrice: 60000, quantity: 1 },
    ])).toEqual([0, 30000]);
  });
  it('se repite por cada 3 unidades, siempre las más baratas', () => {
    expect(thirdItemHalfOffShares([
      { unitPrice: 150000, quantity: 4 },
      { unitPrice: 60000, quantity: 2 },
    ])).toEqual([0, 60000]);
    expect(thirdItemHalfOffShares([
      { unitPrice: 150000, quantity: 5 },
      { unitPrice: 60000, quantity: 1 },
    ])).toEqual([75000, 30000]);
  });
  it('empate de precio: la línea que va antes', () => {
    expect(thirdItemHalfOffShares([
      { unitPrice: 100, quantity: 1 }, { unitPrice: 100, quantity: 1 }, { unitPrice: 100, quantity: 1 },
    ])).toEqual([50, 0, 0]);
  });
});

describe('computeCartTotals con la promoción', () => {
  it('apagada no descuenta nada', () => {
    const t = computeCartTotals([item('a', album(), 3)], { discounts: OFF, shipping: 0 });
    expect(t.promoDiscount).toBe(0);
    expect(t.total).toBe(P.album20x20 * 3);
  });

  it('álbum + calendario de pared + de escritorio: el de escritorio a mitad', () => {
    const items = [item('a', album()), item('b', wall), item('c', desk)];
    const t = computeCartTotals(items, { discounts: PROMO, shipping: 15000 });
    expect(t.promoDiscount).toBe(P.calendarDesk / 2);
    expect(t.promoUnits).toBe(1);
    expect(t.allocations.map(a => a.promoDiscount)).toEqual([0, 0, P.calendarDesk / 2]);
    expect(t.total).toBe(P.album20x20 + P.calendarWall + P.calendarDesk / 2 + 15000);
    expect(t.allocations.reduce((n, a) => n + a.total, 0)).toBe(t.total);
  });

  it('el precio unitario incluye las páginas extra', () => {
    const t = computeCartTotals([item('a', album(48), 3)], { discounts: PROMO, shipping: 0 });
    expect(t.promoDiscount).toBe((P.album20x20 + 8 * P.albumExtra20x20) / 2);
  });

  it('se combina con el % de la tienda (sobre lo que queda) y con el código', () => {
    const items = [item('a', album(), 2), item('b', desk)];
    const t = computeCartTotals(items, { discounts: PROMO_PLUS10, codeDiscount: 10000, shipping: 20000 });
    const afterPromo = 2 * P.album20x20 + P.calendarDesk / 2;
    expect(t.promoDiscount).toBe(P.calendarDesk / 2);
    expect(t.storeDiscount).toBe(Math.round(afterPromo * 0.1));
    expect(t.total).toBe(afterPromo - t.storeDiscount - 10000 + 20000);
    expect(t.allocations.reduce((n, a) => n + a.total, 0)).toBe(t.total);
    expect(t.allocations.every(a => a.total >= 0)).toBe(true);
  });

  it('líneas sin precio unitario cuentan como una unidad', () => {
    const t = computeCartTotals(
      [{ orderId: 'a', lineTotal: 100 }, { orderId: 'b', lineTotal: 200 }, { orderId: 'c', lineTotal: 300 }],
      { discounts: PROMO, shipping: 0 },
    );
    expect(t.promoDiscount).toBe(50);
  });
});

describe('foto del pago', () => {
  it('cada pedido guarda su parte y el resumen la muestra', () => {
    const lines = [
      { orderId: 'a', quantity: 1, pricing: priceOrder(album(), P, 1) },
      { orderId: 'b', quantity: 2, pricing: priceOrder(desk, P, 2) },
    ];
    const totals = computeCartTotals(lines.map(l => cartTotalsItem(l.orderId, l.pricing)), { discounts: PROMO, shipping: 0 });
    const writes = buildCheckoutWrites(lines, totals, {
      shippingAddress: {}, billingAddress: {}, groupId: 'g', code: null, shippingMethod: 'pickup',
      pickupLocation: 'Arboleda, Cali', shippingCity: 'Cali', paymentMethod: 'card', now: '2026-11-27T00:00:00Z',
    });
    expect(writes[1].data.paymentSummary.promoDiscount).toBe(P.calendarDesk / 2);
    expect(writes[1].data.paymentSummary.group.promoDiscount).toBe(P.calendarDesk / 2);
    expect(writes[1].data.total).toBe(P.calendarDesk * 1.5);
    const desc = describeOrderPayment({ ...writes[1].data, productType: 'calendar' });
    expect(desc.lines.some(l => l.label.includes('mitad de precio') && l.amount === -P.calendarDesk / 2)).toBe(true);
  });
});

describe('unitsToNextHalfOff', () => {
  it('cuenta las que faltan', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(unitsToNextHalfOff)).toEqual([0, 2, 1, 0, 2, 1, 0]);
  });
});
