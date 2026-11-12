import { describe, it, expect } from 'vitest';
import { isArchivedDelivery, deliveredAtMs } from './deliveredArchive';

const NOW = new Date('2026-11-12T12:00:00Z').getTime();
const daysAgo = (d: number) => new Date(NOW - d * 24 * 60 * 60 * 1000).toISOString();

describe('isArchivedDelivery', () => {
  it('deja visibles los entregados recientes', () => {
    expect(isArchivedDelivery({ status: 'entregado', deliveredAt: daysAgo(5) }, NOW)).toBe(false);
  });

  it('archiva los entregados de hace más de 30 días', () => {
    expect(isArchivedDelivery({ status: 'entregado', deliveredAt: daysAgo(31) }, NOW)).toBe(true);
  });

  it('sin deliveredAt usa la última edición', () => {
    expect(isArchivedDelivery({ status: 'entregado', updatedAt: daysAgo(40), createdAt: daysAgo(60) }, NOW)).toBe(true);
    expect(isArchivedDelivery({ status: 'entregado', updatedAt: daysAgo(2), createdAt: daysAgo(60) }, NOW)).toBe(false);
  });

  it('deliveredAt manda sobre una edición posterior', () => {
    const o = { status: 'entregado', deliveredAt: daysAgo(45), updatedAt: daysAgo(1) };
    expect(isArchivedDelivery(o, NOW)).toBe(true);
    expect(deliveredAtMs(o)).toBe(new Date(daysAgo(45)).getTime());
  });

  it('nunca archiva pedidos que no están entregados', () => {
    expect(isArchivedDelivery({ status: 'enviado', updatedAt: daysAgo(400) }, NOW)).toBe(false);
  });
});
