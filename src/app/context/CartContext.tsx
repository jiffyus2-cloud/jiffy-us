import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getCart, saveCart, type CartItem } from '../../services/cartService';
import { clampQuantity, MAX_CART_ITEMS } from '../utils/cartPricing';

/**
 * Carrito de compra: varios productos (cada uno su propio pedido en borrador)
 * que se pagan juntos en un solo checkout.
 *
 * El estado se actualiza al instante y se guarda en `users/{uid}.cart` en cola,
 * para que dos cambios seguidos no lleguen a Firestore en desorden.
 */
interface CartContextValue {
  items: CartItem[];
  count: number;
  /** false hasta haber leído el carrito guardado del usuario. */
  loaded: boolean;
  has: (orderId: string) => boolean;
  /** Añade (o deja tal cual si ya estaba). Devuelve false si el carrito está lleno. */
  addItem: (orderId: string, quantity?: number) => Promise<boolean>;
  removeItem: (orderId: string) => Promise<void>;
  removeMany: (orderIds: string[]) => Promise<void>;
  setQuantity: (orderId: string, quantity: number) => Promise<void>;
}

const noop = async () => {};
const CartContext = createContext<CartContextValue>({
  items: [], count: 0, loaded: false,
  has: () => false, addItem: async () => false, removeItem: noop, removeMany: noop, setQuantity: noop,
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const itemsRef = useRef<CartItem[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  // Una promesa que resuelve cuando el carrito guardado ya se leyó: los cambios
  // hechos antes (p. ej. justo al iniciar sesión) esperan a no pisarlo.
  const ready = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let alive = true;
    itemsRef.current = [];
    setItems([]);
    setLoaded(false);
    if (!uid) { setLoaded(true); ready.current = Promise.resolve(); return; }

    ready.current = getCart(uid)
      .then(saved => {
        if (!alive) return;
        itemsRef.current = saved;
        setItems(saved);
      })
      .catch(e => console.warn('[cart] No se pudo leer el carrito', e))
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [uid]);

  const commit = useCallback(async (next: (prev: CartItem[]) => CartItem[]) => {
    if (!uid) return;
    await ready.current;
    const updated = next(itemsRef.current);
    itemsRef.current = updated;
    setItems(updated);
    const run = queue.current.then(() => saveCart(uid, updated));
    queue.current = run.catch(e => console.warn('[cart] No se pudo guardar el carrito', e));
    await run;
  }, [uid]);

  const addItem = useCallback(async (orderId: string, quantity = 1) => {
    await ready.current;
    const prev = itemsRef.current;
    if (prev.some(i => i.orderId === orderId)) return true;
    if (prev.length >= MAX_CART_ITEMS) return false;
    await commit(p => [...p, { orderId, quantity: clampQuantity(quantity), addedAt: new Date().toISOString() }]);
    return true;
  }, [commit]);

  const removeMany = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    await ready.current;
    if (!itemsRef.current.some(i => ids.includes(i.orderId))) return;
    await commit(p => p.filter(i => !ids.includes(i.orderId)));
  }, [commit]);

  const removeItem = useCallback((orderId: string) => removeMany([orderId]), [removeMany]);

  const setQuantity = useCallback((orderId: string, quantity: number) =>
    commit(p => p.map(i => (i.orderId === orderId ? { ...i, quantity: clampQuantity(quantity) } : i))), [commit]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.length,
    loaded,
    has: (id: string) => items.some(i => i.orderId === id),
    addItem, removeItem, removeMany, setQuantity,
  }), [items, loaded, addItem, removeItem, removeMany, setQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
