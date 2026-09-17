import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * El cliente es fino a propósito —quien decide es el backend—, pero tiene dos
 * responsabilidades que sí pueden romperse en silencio: mandar el token de
 * sesión (sin él no hay límite por cliente) y no dejar que un fallo de red se
 * convierta en un descuento aplicado.
 */

const getIdToken = vi.fn();
vi.mock('../lib/firebase', () => ({
  auth: {
    get currentUser() {
      return getIdToken.mock.results.length >= 0 ? { getIdToken } : null;
    },
  },
}));

import { validateDiscountCode } from './discountCodeApi';

const jsonResponse = (body: any, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);

describe('validateDiscountCode', () => {
  beforeEach(() => {
    getIdToken.mockReset();
    getIdToken.mockResolvedValue('token-de-sesion');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('manda el código, el subtotal y el token de sesión', async () => {
    const fetchMock = vi.fn(() => jsonResponse({ ok: true, discount: 30000, code: 'PRUEBA', kind: 'percentage', value: 20 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await validateDiscountCode('PRUEBA', 150000);

    expect(result).toEqual({
      ok: true,
      applied: { code: 'PRUEBA', discount: 30000, kind: 'percentage', value: 20 },
    });

    const [, init] = fetchMock.mock.calls[0] as any;
    expect(JSON.parse(init.body)).toEqual({ code: 'PRUEBA', subtotal: 150000 });
    expect(init.headers.Authorization).toBe('Bearer token-de-sesion');
  });

  it('devuelve el motivo que da el servidor cuando el código no sirve', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ ok: false, reason: 'Este código ya venció.' })));

    const result = await validateDiscountCode('VIEJO', 150000);

    expect(result).toEqual({ ok: false, reason: 'Este código ya venció.' });
  });

  it('un error HTTP no aplica ningún descuento', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({}, false)));

    const result = await validateDiscountCode('LOQUESEA', 150000);

    expect(result.ok).toBe(false);
  });

  it('si la red falla, tampoco se aplica nada', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('sin conexión'))));

    const result = await validateDiscountCode('LOQUESEA', 150000);

    expect(result.ok).toBe(false);
  });

  it('sin sesión no manda cabecera de autorización', async () => {
    getIdToken.mockRejectedValue(new Error('sin sesión'));
    const fetchMock = vi.fn(() => jsonResponse({ ok: false, reason: 'Inicia sesión para usar este código.' }));
    vi.stubGlobal('fetch', fetchMock);

    await validateDiscountCode('PRUEBA', 150000);

    const [, init] = fetchMock.mock.calls[0] as any;
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('normaliza los números que devuelve el servidor', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ ok: true, discount: '25000', code: 'X', kind: 'raro', value: null })));

    const result = await validateDiscountCode('X', 100000);

    expect(result).toEqual({
      ok: true,
      // Un `kind` desconocido cae a porcentaje y un valor nulo a cero: la cifra
      // que manda es `discount`, que ya viene calculada del servidor.
      applied: { code: 'X', discount: 25000, kind: 'percentage', value: 0 },
    });
  });
});
