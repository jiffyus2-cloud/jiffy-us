import { useEffect, useMemo, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useStoreConfig } from '../context/StoreConfigContext';
import { getOrder } from '../../services/orderService';
import { isCartable, priceOrder, type CartItemPricing } from '../utils/cartPricing';

export interface CartLine {
  orderId: string;
  order: any;
  quantity: number;
  pricing: CartItemPricing;
}

/**
 * Pedidos del carrito ya leídos de Firestore y con su precio. Los que ya no
 * pueden comprarse (pagados, borrados) se sacan solos del carrito.
 */
export function useCartOrders() {
  const cart = useCart();
  const config = useStoreConfig();
  const [orders, setOrders] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const idsKey = cart.items.map(i => i.orderId).join(',');
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!cart.loaded) return;
    let alive = true;
    const ids = idsKey ? idsKey.split(',') : [];
    const missing = ids.filter(id => !(id in orders));
    if (missing.length === 0) { setLoading(false); return; }

    setLoading(true);
    Promise.all(missing.map(id => getOrder(id).catch(() => null)))
      .then(results => {
        if (!alive) return;
        const next: Record<string, any> = { ...orders };
        const stale: string[] = [];
        missing.forEach((id, i) => {
          const o = results[i];
          if (isCartable(o)) next[id] = o;
          else stale.push(id);
        });
        setOrders(next);
        if (stale.length > 0) void cart.removeMany(stale);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // `orders` se lee como caché; solo los ids deciden cuándo volver a leer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, cart.loaded, reloadTick]);

  const lines = useMemo<CartLine[]>(() => cart.items
    .filter(i => orders[i.orderId])
    .map(i => ({
      orderId: i.orderId,
      order: orders[i.orderId],
      quantity: i.quantity,
      pricing: priceOrder(orders[i.orderId], config.prices, i.quantity),
    })), [cart.items, orders, config.prices]);

  return {
    lines,
    loading: !cart.loaded || loading,
    /** Vuelve a leer los pedidos (p. ej. después de editar uno). */
    reload: () => { setOrders({}); setReloadTick(t => t + 1); },
  };
}
