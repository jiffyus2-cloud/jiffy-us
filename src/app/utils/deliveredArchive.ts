/**
 * Pedidos entregados: los recientes se quedan en la columna «Entregado» del Kanban
 * y los demás pasan a la zona de «Archivados», para que la columna no crezca sin fin.
 */

/** Días que un pedido entregado sigue visible en el Kanban. */
export const DELIVERED_VISIBLE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

interface OrderLike {
  status?: string;
  deliveredAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

/**
 * Cuándo se entregó. `deliveredAt` se escribe al marcarlo como entregado; los
 * pedidos anteriores a ese campo usan su última edición, que en la práctica es
 * el cambio a «entregado».
 */
export function deliveredAtMs(order: OrderLike): number {
  for (const raw of [order.deliveredAt, order.updatedAt, order.createdAt]) {
    if (!raw) continue;
    const ms = new Date(raw).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
}

export function isArchivedDelivery(
  order: OrderLike,
  nowMs: number = Date.now(),
  visibleDays: number = DELIVERED_VISIBLE_DAYS
): boolean {
  if (order.status !== 'entregado') return false;
  return nowMs - deliveredAtMs(order) > visibleDays * DAY_MS;
}
