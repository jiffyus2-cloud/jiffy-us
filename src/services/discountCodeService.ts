import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EMPTY_DISCOUNT_CODE, normalizeCode, type DiscountCode } from '../app/utils/discountCodes';

/**
 * Acceso a los códigos de descuento en Firestore.
 *
 * El id del documento ES el código en mayúsculas. Así el checkout puede
 * comprobar uno concreto con una sola lectura (`get`) sin poder listar el resto:
 * las reglas dan `get` público pero `list` solo al dueño, de modo que nadie
 * puede descargarse el catálogo entero de códigos.
 */

export const DISCOUNT_CODES_COLLECTION = 'discount_codes';

const codeRef = (code: string) => doc(db, DISCOUNT_CODES_COLLECTION, normalizeCode(code));

/** Rellena lo que falte: un documento viejo no conoce los campos nuevos. */
function toDiscountCode(id: string, data: any): DiscountCode {
  return {
    ...EMPTY_DISCOUNT_CODE,
    ...data,
    code: id,
    // Los contadores y límites llegan como number, pero un documento tocado a
    // mano puede traer strings o nulos y romper las comparaciones.
    value: Number(data?.value) || 0,
    maxUses: Number(data?.maxUses) || 0,
    maxUsesPerUser: Number(data?.maxUsesPerUser) || 0,
    uses: Number(data?.uses) || 0,
    active: data?.active !== false,
    expiresOn: typeof data?.expiresOn === 'string' ? data.expiresOn : '',
    notes: typeof data?.notes === 'string' ? data.notes : '',
  };
}

/** Escucha la lista completa, en vivo. Solo funciona con sesión de administración. */
export function subscribeToDiscountCodes(
  onChange: (codes: DiscountCode[]) => void,
  onError: (message: string) => void
): () => void {
  const q = query(collection(db, DISCOUNT_CODES_COLLECTION), orderBy('__name__'));
  return onSnapshot(
    q,
    snapshot => onChange(snapshot.docs.map(d => toDiscountCode(d.id, d.data()))),
    error => {
      console.error('[Códigos] Error al escuchar la colección:', error);
      onError(error.message);
    }
  );
}

/** Lee un código suelto. Es la lectura que hará el checkout al canjear. */
export async function fetchDiscountCode(code: string): Promise<DiscountCode | null> {
  const snapshot = await getDoc(codeRef(code));
  return snapshot.exists() ? toDiscountCode(snapshot.id, snapshot.data()) : null;
}

/**
 * Crea o actualiza un código.
 *
 * Nunca escribe `uses`: ese contador lo lleva el canje, y pisarlo desde el panel
 * borraría canjes que hayan ocurrido mientras el formulario estaba abierto. Solo
 * se inicializa a cero cuando el código no existía.
 */
export async function saveDiscountCode(code: DiscountCode, adminEmail: string | null): Promise<void> {
  const id = normalizeCode(code.code);
  const ref = doc(db, DISCOUNT_CODES_COLLECTION, id);
  const existing = await getDoc(ref);

  const payload: Record<string, unknown> = {
    code: id,
    kind: code.kind,
    value: code.value,
    active: code.active,
    expiresOn: code.expiresOn,
    maxUses: code.maxUses,
    maxUsesPerUser: code.maxUsesPerUser,
    notes: code.notes,
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail ?? 'desconocido',
  };

  if (!existing.exists()) {
    payload.uses = 0;
    payload.createdAt = serverTimestamp();
    payload.createdBy = adminEmail ?? 'desconocido';
  }

  await setDoc(ref, payload, { merge: true });
}

export async function deleteDiscountCode(code: string): Promise<void> {
  await deleteDoc(codeRef(code));
}
