import { describe, it, expect } from 'vitest';
import { getArchivedDeliveryIds, deliveredAtMs } from './deliveredArchive';

const NOW = new Date('2026-11-12T12:00:00Z').getTime();
const daysAgo = (d: number) => new Date(NOW - d * 24 * 60 * 60 * 1000).toISOString();
const delivered = (id: string, d: number) => ({ id, status: 'entregado', deliveredAt: daysAgo(d) });

describe('getArchivedDeliveryIds', () => {
  it('deja visibles los 3 entregados más recientes y archiva el resto', () => {
    const orders = [delivered('a', 10), delivered('b', 1), delivered('c', 30), delivered('d', 5), delivered('e', 2)];
    expect([...getArchivedDeliveryIds(orders)].sort()).toEqual(['a', 'c']);
  });

  it('con 3 o menos entregados no archiva nada', () => {
    expect(getArchivedDeliveryIds([delivered('a', 100), delivered('b', 200)]).size).toBe(0);
  });

  it('ignora pedidos que no están entregados', () => {
    const orders = [
      { id: 'x', status: 'enviado', updatedAt: daysAgo(400) },
      delivered('a', 1), delivered('b', 2), delivered('c', 3), delivered('d', 4),
    ];
    expect([...getArchivedDeliveryIds(orders)]).toEqual(['d']);
  });

  it('sin deliveredAt usa la última edición', () => {
    const orders = [
      { id: 'old', status: 'entregado', updatedAt: daysAgo(50), createdAt: daysAgo(90) },
      delivered('a', 1), delivered('b', 2), delivered('c', 3),
    ];
    expect([...getArchivedDeliveryIds(orders)]).toEqual(['old']);
  });

  it('deliveredAt manda sobre una edición posterior', () => {
    const o = { status: 'entregado', deliveredAt: daysAgo(45), updatedAt: daysAgo(1) };
    expect(deliveredAtMs(o)).toBe(new Date(daysAgo(45)).getTime());
  });
});
