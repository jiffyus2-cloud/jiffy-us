import { describe, it, expect } from 'vitest';
import { describeOrderPayment, formatPaymentLine, shortSize, shippingFromAddress } from './orderPaymentSummary';

const snapshotOrder = {
  total: 191000,
  paymentMethod: 'nequi',
  paymentSummary: {
    version: 1, productKind: 'album', productLabel: 'Álbum', size: 'Cuadrado 20x20 cm', coverType: 'Tela',
    quantity: 1, pages: 48, extraPages: 8, basePrice: 170000, extraPagePrice: 3750, extraPagesCost: 30000,
    subtotal: 200000, storeDiscountPct: 10, storeDiscount: 20000, discountCode: 'HOLA', codeDiscount: 5000,
    shippingMethod: 'national', pickupLocation: null, shippingCity: 'Bogotá', shipping: 16000,
    total: 191000, paymentMethod: 'nequi', createdAt: '2026-11-25T00:00:00Z',
  },
};

describe('describeOrderPayment', () => {
  it('usa el desglose exacto guardado en el checkout', () => {
    const d = describeOrderPayment(snapshotOrder);
    expect(d.exact).toBe(true);
    expect(d.total).toBe(191000);
    expect(d.paymentMethodLabel).toBe('Nequi');
    expect(d.lines.map(formatPaymentLine)).toEqual([
      '1 × Álbum · 20x20 cm · tapa en tela: $170.000',
      '8 páginas extra: $30.000',
      'Descuento de la tienda (10%): −$20.000',
      'Código de descuento HOLA: −$5.000',
      'Envío nacional a Bogotá: $16.000',
    ]);
  });

  it('reconstruye pedidos antiguos sin inventar importes', () => {
    const d = describeOrderPayment({
      productType: 'album', total: 180000, discountCode: 'X', discountCodeAmount: 2000,
      customization: { size: 'Cuadrado 30x30 cm', coverType: 'Papel' },
      pages: new Array(42).fill({}),
      shippingAddress: { city: 'Cali', address: 'Calle 1' },
    });
    expect(d.exact).toBe(false);
    expect(d.lines.map(formatPaymentLine)).toEqual([
      '1 × Álbum · 30x30 cm · tapa dura impresa',
      '2 páginas extra',
      'Código de descuento X: −$2.000',
      'Envío local a Cali',
    ]);
    expect(d.total).toBe(180000);
  });

  it('detecta la recogida en punto', () => {
    expect(shippingFromAddress({ shippingAddress: { city: 'Cali', address: 'Recogida en punto: Arboleda, Cali' } }))
      .toEqual({ method: 'pickup', pickupLocation: 'Arboleda, Cali', city: 'Cali' });
  });

  it('acorta los tamaños', () => {
    expect(shortSize('Vertical 28x21 cm')).toBe('28x21 cm');
  });
});
