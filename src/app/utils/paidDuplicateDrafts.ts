/**
 * Borradores que el cliente en realidad ya pagó como OTRO pedido.
 *
 * Cómo nacían: el cliente abría su borrador X (desde «Mis borradores» o volviendo
 * del checkout) y encima del diseño ya cargado saltaba el aviso «tienes borradores
 * guardados». Si lo cerraba con la X o pulsaba «Empezar nuevo», el editor olvidaba
 * el id de X pero conservaba sus fotos, y el siguiente guardado creaba un pedido Y
 * nuevo. Y es el que se pagaba; X se quedaba para siempre como borrador.
 *
 * La huella es inequívoca: Y guarda las URLs de Storage de las fotos que ya estaban
 * subidas en la carpeta de X (`orders/{uid}/{X}/…`). Los ids de Firestore son 20
 * caracteres aleatorios, así que encontrar `/{X}/` dentro del diseño de Y no puede
 * ser casualidad. Solo miramos pedidos del mismo cliente.
 */

/** Estados en los que el pedido ya está pagado (o más allá). */
export const PAID_OR_LATER_STATUSES: readonly string[] = [
  'paid', 'mock_paid', 'en_produccion', 'enviado', 'entregado',
];

/** Estados que el panel lista como «Pendientes de Pago / Borradores». */
const DRAFT_LIKE_STATUSES: readonly string[] = ['draft', 'saved_draft', 'pending_payment'];

interface OrderLike {
  id: string;
  userId?: string | null;
  status?: string;
  [key: string]: any;
}

/** Texto donde buscar referencias a carpetas de Storage dentro del diseño. */
function designFingerprint(order: OrderLike): string {
  try {
    return JSON.stringify([
      order.pages, order.photos, order.coverData, order.customization,
    ]);
  } catch {
    return '';
  }
}

/** ¿El diseño menciona la carpeta de Storage del pedido `folderId`? */
function referencesFolder(fingerprint: string, folderId: string): boolean {
  // Las URLs de descarga de Firebase codifican la ruta (`%2F`); las de gs/https crudas, no.
  return fingerprint.includes(`%2F${folderId}%2F`) || fingerprint.includes(`/${folderId}/`);
}

/**
 * Devuelve, para cada borrador que ya se pagó como otro pedido, ese pedido pagado.
 * Clave: id del borrador. Valor: el pedido pagado que reutiliza sus fotos.
 */
export function findPaidDuplicateDrafts<T extends OrderLike>(orders: readonly T[]): Map<string, T> {
  const paidByUser = new Map<string, { order: T; fingerprint: string }[]>();
  for (const o of orders) {
    if (!o.userId || !PAID_OR_LATER_STATUSES.includes(o.status ?? '')) continue;
    const list = paidByUser.get(o.userId) ?? [];
    list.push({ order: o, fingerprint: designFingerprint(o) });
    paidByUser.set(o.userId, list);
  }

  const result = new Map<string, T>();
  for (const draft of orders) {
    if (!draft.userId || !DRAFT_LIKE_STATUSES.includes(draft.status ?? '')) continue;
    const candidates = paidByUser.get(draft.userId);
    if (!candidates) continue;
    const match = candidates.find(
      c => c.order.id !== draft.id && referencesFolder(c.fingerprint, draft.id)
    );
    if (match) result.set(draft.id, match.order);
  }
  return result;
}
