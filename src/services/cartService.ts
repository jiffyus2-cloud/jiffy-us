import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { clampQuantity, MAX_CART_ITEMS } from '../app/utils/cartPricing';
import { sanitizeForFirestore } from './orderService';

/** Ids de la compra en curso, para que /success limpie el carrito al confirmar. */
export const PENDING_CHECKOUT_IDS_KEY = 'pending_checkout_order_ids';

/**
 * Carrito del cliente. Vive en `users/{uid}.cart` (las reglas ya dejan a cada
 * usuario escribir su perfil), así sobrevive a recargas y cambios de equipo.
 *
 * Cada elemento apunta a un pedido existente (`orders/{id}`, en borrador): el
 * diseño sigue guardado en el pedido y el carrito solo recuerda cuáles van en
 * la próxima compra y cuántas copias de cada uno.
 */
export interface CartItem {
  orderId: string;
  quantity: number;
  addedAt: string;
}

export function normalizeCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CartItem[] = [];
  for (const r of raw) {
    const id = typeof (r as any)?.orderId === 'string' ? (r as any).orderId.trim() : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      orderId: id,
      quantity: clampQuantity((r as any)?.quantity),
      addedAt: typeof (r as any)?.addedAt === 'string' ? (r as any).addedAt : new Date().toISOString(),
    });
    if (out.length >= MAX_CART_ITEMS) break;
  }
  return out;
}

export async function getCart(uid: string): Promise<CartItem[]> {
  const snap = await getDoc(doc(db, 'users', uid));
  return normalizeCartItems(snap.exists() ? snap.data()?.cart?.items : []);
}

export async function saveCart(uid: string, items: CartItem[]): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { cart: { items: normalizeCartItems(items), updatedAt: new Date().toISOString() } },
    { merge: true },
  );
}

/** Lo que el checkout escribe en cada pedido de la compra antes de cobrar. */
export interface CheckoutOrderWrite {
  orderId: string;
  data: Record<string, any>;
}

/**
 * Escribe direcciones, totales y desglose en TODOS los pedidos de la compra de
 * una vez: o quedan todos listos para cobrar o ninguno.
 */
export async function writeCheckoutOrders(writes: CheckoutOrderWrite[]): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  for (const w of writes) {
    batch.update(doc(db, 'orders', w.orderId), sanitizeForFirestore({ ...w.data, updatedAt: now }));
  }
  await batch.commit();
}
