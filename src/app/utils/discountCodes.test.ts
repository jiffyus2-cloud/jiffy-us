import { describe, it, expect } from 'vitest';
import {
  EMPTY_DISCOUNT_CODE,
  describeDiscount,
  describeLimits,
  evaluateRedemption,
  getCodeStatus,
  normalizeCode,
  todayISO,
  validateCodeForm,
  type DiscountCode,
} from './discountCodes';

const code = (overrides: Partial<DiscountCode> = {}): DiscountCode => ({
  ...EMPTY_DISCOUNT_CODE,
  code: 'PRUEBA',
  ...overrides,
});

describe('normalizeCode', () => {
  it('sube a mayúsculas y quita espacios, para que no nazcan dos códigos iguales', () => {
    expect(normalizeCode(' bienvenido 20 ')).toBe('BIENVENIDO20');
  });

  it('quita acentos y caracteres que Firestore no admite en un id', () => {
    expect(normalizeCode('AÑO/NUEVO')).toBe('ANONUEVO');
    expect(normalizeCode('DESC.10%')).toBe('DESC10');
  });

  it('conserva guion y guion bajo', () => {
    expect(normalizeCode('black_friday-2026')).toBe('BLACK_FRIDAY-2026');
  });

  it('corta los códigos absurdamente largos', () => {
    expect(normalizeCode('A'.repeat(80))).toHaveLength(32);
  });
});

describe('getCodeStatus', () => {
  it('un código apagado sale como desactivado aunque esté en fecha', () => {
    expect(getCodeStatus(code({ active: false }), '2026-01-01')).toBe('inactive');
  });

  it('vence al día siguiente de su fecha límite, no el mismo día', () => {
    const c = code({ expiresOn: '2026-03-10' });
    expect(getCodeStatus(c, '2026-03-10')).toBe('active');
    expect(getCodeStatus(c, '2026-03-11')).toBe('expired');
  });

  it('se agota al llegar al tope de usos', () => {
    expect(getCodeStatus(code({ maxUses: 5, uses: 4 }), '2026-01-01')).toBe('active');
    expect(getCodeStatus(code({ maxUses: 5, uses: 5 }), '2026-01-01')).toBe('exhausted');
  });

  it('sin tope de usos nunca se agota', () => {
    expect(getCodeStatus(code({ maxUses: 0, uses: 9999 }), '2026-01-01')).toBe('active');
  });

  it('caducado y agotado a la vez se explica como caducado', () => {
    const c = code({ expiresOn: '2026-01-01', maxUses: 1, uses: 1 });
    expect(getCodeStatus(c, '2026-06-01')).toBe('expired');
  });
});

describe('evaluateRedemption', () => {
  const ctx = { usesByThisUser: 0, today: '2026-03-01' };

  it('aplica el porcentaje sobre el subtotal', () => {
    const result = evaluateRedemption(code({ kind: 'percentage', value: 20 }), 150000, ctx);
    expect(result).toEqual({ ok: true, discount: 30000 });
  });

  it('nunca descuenta más que el subtotal', () => {
    const result = evaluateRedemption(code({ kind: 'amount', value: 50000 }), 30000, ctx);
    expect(result).toEqual({ ok: true, discount: 30000 });
  });

  it('rechaza el código vencido', () => {
    const result = evaluateRedemption(code({ expiresOn: '2026-02-28' }), 100000, ctx);
    expect(result).toMatchObject({ ok: false });
  });

  it('rechaza cuando se llegó al tope general', () => {
    const result = evaluateRedemption(code({ maxUses: 2, uses: 2 }), 100000, ctx);
    expect(result).toMatchObject({ ok: false });
  });

  it('rechaza cuando ESTE cliente ya lo gastó, aunque queden usos generales', () => {
    const result = evaluateRedemption(
      code({ maxUses: 100, uses: 3, maxUsesPerUser: 1 }),
      100000,
      { usesByThisUser: 1, today: '2026-03-01' }
    );
    expect(result).toMatchObject({ ok: false });
  });

  it('con límite por cliente en 0 no cuenta cuántas veces lo haya usado', () => {
    const result = evaluateRedemption(
      code({ maxUsesPerUser: 0 }),
      100000,
      { usesByThisUser: 12, today: '2026-03-01' }
    );
    expect(result).toMatchObject({ ok: true });
  });

  it('rechaza el código apagado', () => {
    expect(evaluateRedemption(code({ active: false }), 100000, ctx)).toMatchObject({ ok: false });
  });
});

describe('validateCodeForm', () => {
  it('acepta un código razonable', () => {
    expect(validateCodeForm(code({ code: 'BIENVENIDO20', value: 15 }))).toEqual([]);
  });

  it('exige un código con cuerpo', () => {
    expect(validateCodeForm(code({ code: 'AB' })).length).toBeGreaterThan(0);
  });

  it('no deja porcentajes imposibles', () => {
    expect(validateCodeForm(code({ kind: 'percentage', value: 0 })).length).toBeGreaterThan(0);
    expect(validateCodeForm(code({ kind: 'percentage', value: 120 })).length).toBeGreaterThan(0);
  });

  it('no deja que el límite por cliente supere al total', () => {
    expect(validateCodeForm(code({ maxUses: 5, maxUsesPerUser: 10 })).length).toBeGreaterThan(0);
  });

  it('no deja crear un código que nacería vencido', () => {
    expect(validateCodeForm(code({ expiresOn: '2020-01-01' })).length).toBeGreaterThan(0);
  });

  it('acepta la fecha de hoy: el código vale hasta el final del día', () => {
    expect(validateCodeForm(code({ expiresOn: todayISO() }))).toEqual([]);
  });
});

describe('textos del panel', () => {
  it('describe el descuento según su tipo', () => {
    expect(describeDiscount(code({ kind: 'percentage', value: 20 }))).toContain('20%');
    expect(describeDiscount(code({ kind: 'amount', value: 25000 }))).toContain('25.000');
  });

  it('describe los límites, incluido «sin límite»', () => {
    expect(describeLimits(code({ maxUses: 10, uses: 3, maxUsesPerUser: 1 }))).toBe(
      '3 de 10 usos · máx. 1 por cliente'
    );
    expect(describeLimits(code({ maxUses: 0, uses: 3, maxUsesPerUser: 0 }))).toBe(
      '3 usos (sin límite) · sin límite por cliente'
    );
  });
});
