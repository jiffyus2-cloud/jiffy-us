import { describe, it, expect } from 'vitest';
import { describeOrderPayment, formatPaymentLine, shortSize, shippingFromAddress, orderCopies, clampCopies } from './orderPaymentSummary';

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

describe('copias de un mismo producto', () => {
  it('multiplica producto y páginas extra por las copias', () => {
    const d = describeOrderPayment({
      total: 400000,
      quantity: 2,
      paymentSummary: { ...snapshotOrder.paymentSummary, quantity: 2, subtotal: 400000, storeDiscount: 0, storeDiscountPct: null, codeDiscount: 0, discountCode: null, shipping: 0, shippingMethod: 'pickup', pickupLocation: 'Arboleda, Cali' },
    });
    expect(d.lines.map(formatPaymentLine).slice(0, 2)).toEqual([
      '2 × Álbum · 20x20 cm · tapa en tela: $340.000',
      '8 páginas extra × 2 copias: $60.000',
    ]);
    expect(d.lines[0].detail).toBe('2 copias × $170.000 · 48 páginas (40 incluidas)');
    expect(d.headline.startsWith('2 × Álbum')).toBe(true);
  });

  it('calendarios: 5 copias iguales', () => {
    const d = describeOrderPayment({
      quantity: 5, total: 250000,
      paymentSummary: {
        version: 1, productKind: 'calendar', productLabel: 'Calendario de pared', quantity: 5, basePrice: 50000,
        subtotal: 250000, storeDiscount: 0, codeDiscount: 0, shippingMethod: 'pickup', shipping: 0, total: 250000, createdAt: '',
      },
    });
    expect(formatPaymentLine(d.lines[0])).toBe('5 × Calendario de pared: $250.000');
  });

  it('pedidos sin dato son de una copia y el valor se acota', () => {
    expect(orderCopies({})).toBe(1);
    expect(orderCopies({ paymentSummary: { quantity: 3 } })).toBe(3);
    expect(orderCopies({ quantity: 4 })).toBe(4);
    expect(clampCopies(0)).toBe(1);
    expect(clampCopies('abc')).toBe(1);
    expect(clampCopies(999)).toBe(50);
  });
});
