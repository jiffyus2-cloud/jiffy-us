import { isTelaOrder, orderProductKind } from './cartPricing';

const isRealImage = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '' && !v.includes('justwhite');

/**
 * Imagen que representa el pedido en listas (carrito, checkout): la portada si
 * la tiene; si no (o es tela, o es la portada en blanco), la primera foto
 * interior; en el calendario, la de enero.
 */
export function orderThumbnail(order: any): string | null {
  if (!order) return null;
  const kind = orderProductKind(order);

  if (kind === 'calendar') {
    const jan = order.pages?.[0];
    if (Array.isArray(jan?.images) && isRealImage(jan.images[0])) return jan.images[0];
    if (isRealImage(jan?.image)) return jan.image;
    // Las fotos del calendario conservan huecos ('') por mes: tomar la primera real.
    const first = (order.photos || []).map((p: any) => (Array.isArray(p) ? p[0] : p)).find(isRealImage);
    return first ?? (isRealImage(order.product?.image) ? order.product.image : null);
  }

  const cover = order.coverData?.image;
  if (kind === 'album' && isRealImage(cover) && !isTelaOrder(order)) return cover;

  for (const page of order.pages || []) {
    const imgs = Array.isArray(page) ? page : page?.images;
    const found = (imgs || []).find(isRealImage);
    if (found) return found;
  }
  for (const p of order.photos || []) {
    const found = Array.isArray(p) ? p.find(isRealImage) : (isRealImage(p) ? p : null);
    if (found) return found;
  }
  if (isRealImage(cover)) return cover;
  return isRealImage(order.product?.image) ? order.product.image : null;
}
