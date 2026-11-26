import { describe, it, expect } from 'vitest';
import {
  clampQuantity, computeCartTotals, isCartable, orderProductKind, priceOrder, prorate, shippingCost,
  MAX_ITEM_QUANTITY,
} from './cartPricing';
import { INITIAL_STORE_CONFIG } from './storeConfigState';

const P = INITIAL_STORE_CONFIG.prices;
const OFF = { active: false, percentage: 10 };
const ON10 = { active: true, percentage: 10 };

const album = (pages: number, over: any = {}) => ({
  productType: 'album',
  customization: { size: 'Cuadrado 20x20 cm', coverType: 'Papel', ...over },
  pages: Array.from({ length: pages }, (_, i) => ({ pageIndex: i, images: [] })),
});
const wall = { productType: 'calendar', customization: { type: 'wall-notes', year: 2027 } };
const desk = { productType: 'calendar', customization: { type: 'desk', year: 2027 } };

describe('priceOrder', () => {
  it('álbum: base + páginas extra, por copia', () => {
    const p = priceOrder(album(46), P, 2);
    expect(p.kind).toBe('album');
    expect(p.extraPages).toBe(6);
    expect(p.unitPrice).toBe(P.album20x20 + 6 * P.albumExtra20x20);
    expect(p.lineTotal).toBe(p.unitPrice * 2);
  });

  it('álbum en tela usa su precio', () => {
    expect(priceOrder(album(40, { coverType: 'Tela' }), P).unitPrice).toBe(P.albumTela20x20);
  });

  it('calendarios de pared y escritorio', () => {
    expect(priceOrder(wall, P).unitPrice).toBe(P.calendarWall);
    expect(priceOrder(desk, P).unitPrice).toBe(P.calendarDesk);
    expect(orderProductKind(wall)).toBe('calendar');
  });

  it('la cantidad se acota', () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity('3')).toBe(3);
    expect(clampQuantity(999)).toBe(MAX_ITEM_QUANTITY);
    expect(clampQuantity(NaN)).toBe(1);
  });
});

describe('shippingCost', () => {
  it('recogida gratis, Cali local, resto nacional, sin ciudad null', () => {
    expect(shippingCost({ pickup: true }, P)).toBe(0);
    expect(shippingCost({ pickup: false, city: 'Santiago de Cali' }, P)).toBe(P.shippingCali);
    expect(shippingCost({ pickup: false, city: 'Bogotá' }, P)).toBe(P.shippingNational);
    expect(shippingCost({ pickup: false, city: ' ' }, P)).toBeNull();
  });
});

describe('prorate', () => {
  it('reparte exacto y proporcional', () => {
    expect(prorate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(prorate(15000, [150000, 80000, 60000]).reduce((a, b) => a + b, 0)).toBe(15000);
    expect(prorate(0, [5, 5])).toEqual([0, 0]);
    expect(prorate(10, [0, 0])).toEqual([10, 0]);
    expect(prorate(10, [])).toEqual([]);
  });

  it('ninguna parte supera su peso', () => {
    const w = [3, 997];
    const s = prorate(1000, w);
    s.forEach((x, i) => expect(x).toBeLessThanOrEqual(w[i]));
  });
});

describe('computeCartTotals', () => {
  const items = [
    { orderId: 'a', lineTotal: 172500 },
    { orderId: 'b', lineTotal: 80000 },
    { orderId: 'c', lineTotal: 120000 },
  ];

  it('un solo envío, en el pedido principal', () => {
    const t = computeCartTotals(items, { discounts: OFF, shipping: 20000 });
    expect(t.subtotal).toBe(372500);
    expect(t.total).toBe(392500);
    expect(t.allocations.map(a => a.shipping)).toEqual([20000, 0, 0]);
  });

  it('las partes suman exactamente el total', () => {
    const t = computeCartTotals(items, { discounts: ON10, codeDiscount: 33333, shipping: 15000 });
    expect(t.storeDiscount).toBe(37250);
    expect(t.codeDiscount).toBe(33333);
    expect(t.total).toBe(372500 - 37250 - 33333 + 15000);
    expect(t.allocations.reduce((n, a) => n + a.total, 0)).toBe(t.total);
    expect(t.allocations.reduce((n, a) => n + a.codeDiscount, 0)).toBe(33333);
    t.allocations.forEach(a => expect(a.total).toBeGreaterThanOrEqual(0));
  });

  it('un código mayor que el subtotal no deja el total en negativo', () => {
    const t = computeCartTotals([{ orderId: 'a', lineTotal: 50000 }], { discounts: OFF, codeDiscount: 90000, shipping: 0 });
    expect(t.codeDiscount).toBe(50000);
    expect(t.total).toBe(0);
  });

  it('sin ciudad el envío queda pendiente y no suma', () => {
    const t = computeCartTotals(items, { discounts: OFF, shipping: null });
    expect(t.shipping).toBeNull();
    expect(t.total).toBe(372500);
  });

  it('un solo producto se comporta como el checkout de siempre', () => {
    const t = computeCartTotals([{ orderId: 'a', lineTotal: 150000 }], { discounts: ON10, shipping: 15000 });
    expect(t.total).toBe(150000 - 15000 + 15000);
    expect(t.allocations[0].total).toBe(t.total);
  });
});

describe('isCartable', () => {
  it('solo borradores y pendientes de pago', () => {
    expect(isCartable({ status: 'saved_draft' })).toBe(true);
    expect(isCartable({ status: 'pending_payment' })).toBe(true);
    expect(isCartable({ status: 'paid' })).toBe(false);
    expect(isCartable({ status: 'saved_draft', productType: 'custom-album' })).toBe(false);
    expect(isCartable(null)).toBe(false);
  });
});
