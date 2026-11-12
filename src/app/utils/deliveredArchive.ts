/**
 * Pedidos entregados: solo los más recientes se quedan en la columna «Entregado»
 * del Kanban y los demás pasan a la zona de «Archivados», para que la columna no
 * crezca sin fin.
 */

/** Cuántos pedidos entregados siguen visibles en el Kanban. */
export const DELIVERED_VISIBLE_COUNT = 3;

interface OrderLike {
  id: string;
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
export function deliveredAtMs(order: Omit<OrderLike, 'id'>): number {
  for (const raw of [order.deliveredAt, order.updatedAt, order.createdAt]) {
    if (!raw) continue;
    const ms = new Date(raw).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
}

/**
 * Ids de los pedidos entregados que van a «Archivados»: todos menos los
 * `visibleCount` entregados más recientemente. Se calcula sobre TODOS los pedidos
 * (no sobre el resultado de una búsqueda) para que la columna no cambie de
 * contenido al buscar.
 */
export function getArchivedDeliveryIds(
  orders: readonly OrderLike[],
  visibleCount: number = DELIVERED_VISIBLE_COUNT
): Set<string> {
  const delivered = orders
    .filter(o => o.status === 'entregado')
    .sort((a, b) => deliveredAtMs(b) - deliveredAtMs(a));
  return new Set(delivered.slice(visibleCount).map(o => o.id));
}
