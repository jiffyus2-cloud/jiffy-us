import { db, storage } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';

/**
 * Versión del esquema del documento `orders/{id}`.
 * v2 añade `photoCount`, que permite detectar por query cualquier discrepancia entre
 * el número de fotos que el editor creía tener y las que realmente quedaron guardadas.
 */
export const SCHEMA_VERSION = 2;

export const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeForFirestore(item));

  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = sanitizeForFirestore(value);
    }
    return acc;
  }, {} as any);
};

const isBase64 = (str: string | undefined | null) => {
  if (!str) return false;
  if (typeof str !== 'string') return false;
  if (str.startsWith('data:image')) return true;
  return false;
};

const isBlobUrl = (str: string | undefined | null) => {
  if (!str) return false;
  if (typeof str !== 'string') return false;
  return str.startsWith('blob:');
};

/** Una URL local (`blob:` o `data:`) solo vive en esta pestaña: nunca debe llegar a Firestore. */
const isLocalUrl = (str: any): str is string => isBase64(str) || isBlobUrl(str);

// ─────────────────────────────────────────────────────────────────────────────
// Errores tipados
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadFailure {
  /** Índice de página, o -1 si el fallo es de la portada. */
  pageIndex: number;
  /** Índice de slot dentro de la página, o -1 para portada. */
  slotIndex: number;
  /** URL local original, para poder señalarla en el editor. */
  sourceUrl: string;
}

/**
 * Se lanza cuando alguna imagen no se pudo subir tras todos los reintentos.
 * El guardado se aborta ENTERO: es preferible dejar intacto el último documento
 * válido a persistir un documento con huecos donde antes había fotos.
 */
export class PhotoUploadError extends Error {
  constructor(public failures: UploadFailure[]) {
    super(`No se pudieron subir ${failures.length} foto(s)`);
    this.name = 'PhotoUploadError';
  }
}

/**
 * Se lanza cuando el guardado reduciría de forma sospechosa el número de fotos
 * del pedido. El llamante decide si confirmar con el usuario y reintentar con
 * `allowShrink`.
 */
export class PhotoLossError extends Error {
  constructor(public before: number, public after: number) {
    super(`El guardado reduciría las fotos de ${before} a ${after}`);
    this.name = 'PhotoLossError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de conteo y validación (puras: testeadas en orderService.test.ts)
// ─────────────────────────────────────────────────────────────────────────────

/** Fotos reales (no huecos) en la estructura `pages` de un álbum. */
export function countAlbumPhotos(pages: any[] | undefined | null): number {
  return (pages || []).reduce(
    (n: number, p: any) => n + (Array.isArray(p?.images) ? p.images.filter(Boolean).length : 0),
    0
  );
}

/** Fotos de un documento/payload, sea álbum, taza, calendario o pack. */
export function countPersistedPhotos(data: any): number {
  const fromPages = countAlbumPhotos(data?.pages);
  if (fromPages > 0) return fromPages;

  const fromItems = (data?.items || data?.mugItems || []).reduce(
    (n: number, it: any) => n + (it?.photos || []).filter(Boolean).length,
    0
  );
  if (fromItems > 0) return fromItems;

  return (data?.photos || []).filter(Boolean).length;
}

/**
 * Última línea de defensa antes de escribir en Firestore. Una `blob:` persistida
 * es basura irrecuperable (muere con la pestaña), así que preferimos fallar ruidosamente.
 */
export function assertNoLocalUrls(payload: any): void {
  const bad: string[] = [];
  JSON.stringify(payload, (_key, value) => {
    if (isLocalUrl(value)) bad.push(String(value).slice(0, 40));
    return value;
  });
  if (bad.length > 0) {
    throw new Error(
      `Intento de persistir ${bad.length} URL(s) locales en Firestore: ${bad.slice(0, 3).join(', ')}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Subida de imágenes
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function uploadImage(path: string, imageData: string): Promise<string> {
  const storageRef = ref(storage, path);

  if (isBase64(imageData)) {
    const result = await uploadString(storageRef, imageData, 'data_url');
    return await getDownloadURL(result.ref);
  } else if (isBlobUrl(imageData)) {
    const response = await fetch(imageData);
    const blob = await response.blob();
    const result = await uploadBytes(storageRef, blob);
    return await getDownloadURL(result.ref);
  }

  return imageData;
}

/** Subida con reintentos y backoff exponencial + jitter (0.5 s, 1 s). */
async function uploadImageWithRetry(path: string, imageData: string, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await uploadImage(path, imageData);
    } catch (error) {
      lastError = error;
      console.warn(`[upload] intento ${i + 1}/${attempts} falló para ${path}`, error);
      if (i < attempts - 1) await sleep(500 * 2 ** i + Math.random() * 250);
    }
  }
  throw lastError;
}

interface UploadContext {
  folderPath: string;
  /** blob:/data: → URL de Storage ya conocida de un guardado anterior de esta sesión. */
  knownUrls: Record<string, string>;
  /** Nuevas equivalencias descubiertas en este guardado; se devuelven al llamante. */
  newUrls: Record<string, string>;
  failures: UploadFailure[];
  tick: () => void;
}

/**
 * Devuelve la URL remota de una imagen, subiéndola si hace falta.
 * Devuelve `null` SOLO si la subida falló definitivamente; en ese caso el fallo queda
 * registrado en `ctx.failures` y el guardado se abortará antes de escribir nada.
 */
async function resolvePhotoUrl(
  source: string | null | undefined,
  ctx: UploadContext,
  buildPath: () => string,
  pageIndex: number,
  slotIndex: number
): Promise<string | null> {
  if (!source) return null;
  // Ya es una URL de Storage: idempotente, no se resube.
  if (!isLocalUrl(source)) return source;

  const cached = ctx.knownUrls[source] || ctx.newUrls[source];
  if (cached) {
    ctx.tick();
    return cached;
  }

  try {
    const url = await uploadImageWithRetry(buildPath(), source);
    ctx.newUrls[source] = url;
    return url;
  } catch {
    ctx.failures.push({ pageIndex, slotIndex, sourceUrl: source });
    return null;
  } finally {
    ctx.tick();
  }
}

const photoPath = (ctx: UploadContext, i: number, j: number) =>
  `${ctx.folderPath}/photos/${i}_${j}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * Construye `pages` para un álbum. Antes esta lógica estaba duplicada literalmente
 * en `createDraftOrder` y `updateOrderDesign`, y la copia de cada una tenía su propio
 * `catch { photoUrl = null }` silencioso.
 */
async function buildAlbumPages(designData: any, ctx: UploadContext): Promise<any[]> {
  const {
    photos = [],
    pageLayouts = {},
    pageLayoutVariants = {},
    textBoxSlots = {},
    photoCrops = {},
  } = designData;

  const pages: any[] = [];

  for (let i = 0; i < photos.length; i++) {
    // Aseguramos que sea un array para evitar el error de .forEach is not a function
    const pagePhotos = Array.isArray(photos[i]) ? photos[i] : [photos[i]];
    const variantSlotCount = (pageLayoutVariants[i] as number) || pagePhotos.length;
    const totalSlots = Math.max(pagePhotos.length, variantSlotCount);
    const uploadedPhotos: (string | null)[] = [];
    const pageCrops: any = {};

    for (let j = 0; j < totalSlots; j++) {
      const source: string | null = (j < pagePhotos.length ? pagePhotos[j] : null) || null;
      const photoUrl = await resolvePhotoUrl(source, ctx, () => photoPath(ctx, i, j), i, j);
      if (photoUrl) {
        pageCrops[j] = photoCrops[`${i}-${j}`] || { x: 50, y: 50, zoom: 1 };
      }
      uploadedPhotos.push(photoUrl);
    }

    pages.push({
      pageIndex: i,
      images: uploadedPhotos,
      layout: pageLayouts[i] || 1,
      variant: pageLayoutVariants[i] || null,
      texts: textBoxSlots[i] || {},
      crops: pageCrops,
    });
  }

  return pages;
}

async function buildMugItems(items: any[], ctx: UploadContext): Promise<any[]> {
  const finalItems: any[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const uploadedItemPhotos: string[] = [];
    for (let j = 0; j < (item.photos?.length || 0); j++) {
      const url = await resolvePhotoUrl(
        item.photos[j], ctx, () => `${ctx.folderPath}/mugs/mug${i}_photo${j}`, i, j
      );
      if (url) uploadedItemPhotos.push(url);
    }
    finalItems.push({ ...item, photos: uploadedItemPhotos });
  }
  return finalItems;
}

async function buildLoosePhotos(photos: any[], ctx: UploadContext): Promise<string[]> {
  const finalPhotos: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const source = Array.isArray(photos[i]) ? photos[i][0] : photos[i];
    const url = await resolvePhotoUrl(
      source, ctx, () => `${ctx.folderPath}/loose_photos/photo${i}`, i, 0
    );
    if (url) finalPhotos.push(url);
  }
  return finalPhotos;
}

/** Cuenta cuántas imágenes locales hay que resolver, para la barra de progreso. */
function countPendingUploads(designData: any): number {
  let total = 0;
  if (isLocalUrl(designData?.coverData?.image)) total++;

  (designData?.photos || []).forEach((item: any) => {
    if (Array.isArray(item)) item.forEach((url: any) => { if (isLocalUrl(url)) total++; });
    else if (isLocalUrl(item)) total++;
  });

  (designData?.items || designData?.mugItems || []).forEach((item: any) => {
    (item?.photos || []).forEach((url: any) => { if (isLocalUrl(url)) total++; });
  });

  return total;
}

interface ProcessedAssets {
  coverData: any;
  finalPages: any[];
  finalItems: any[];
  finalPhotos: string[];
  newUrls: Record<string, string>;
  failures: UploadFailure[];
}

/** Sube todas las imágenes del diseño y devuelve la estructura lista para Firestore. */
async function processDesignAssets(
  designData: any,
  productString: string,
  folderPath: string,
  knownUrls: Record<string, string>,
  onProgress?: (progress: number) => void
): Promise<ProcessedAssets> {
  const totalUploads = countPendingUploads(designData);
  let completedUploads = 0;

  const ctx: UploadContext = {
    folderPath,
    knownUrls,
    newUrls: {},
    failures: [],
    tick: () => {
      completedUploads++;
      if (onProgress && totalUploads > 0) {
        onProgress(Math.min(95, Math.round((completedUploads / totalUploads) * 100)));
      }
    },
  };

  if (totalUploads === 0 && onProgress) onProgress(50);

  const coverData = { ...designData.coverData };
  if (coverData.image) {
    const resolved = await resolvePhotoUrl(
      coverData.image, ctx, () => `${folderPath}/cover_image`, -1, -1
    );
    // Si falló, `ctx.failures` ya lo registró y el guardado se abortará más abajo.
    coverData.image = resolved ?? '';
  }

  const isMugType = productString.includes('mug') || productString.includes('taza');
  const itemsToProcess = designData.items || designData.mugItems || [];

  let finalPages: any[] = [];
  let finalItems: any[] = [];
  let finalPhotos: string[] = [];

  if (productString.includes('album') || productString.includes('photobook')) {
    finalPages = await buildAlbumPages(designData, ctx);
  } else if (isMugType) {
    finalItems = await buildMugItems(itemsToProcess, ctx);
  } else if (
    productString.includes('calendar') ||
    productString.includes('calendario') ||
    productString.includes('pack')
  ) {
    finalPhotos = await buildLoosePhotos(designData.photos || [], ctx);
  }

  return { coverData, finalPages, finalItems, finalPhotos, newUrls: ctx.newUrls, failures: ctx.failures };
}

/**
 * Lista plana de fotos, duplicada en el campo raíz `photos` por compatibilidad
 * (la leen OrderDetailsModal y los exportes de OwnerDashboard).
 * Nunca puede contener URLs locales.
 */
function buildFlatPhotoList(assets: ProcessedAssets, designData: any): string[] {
  if (assets.finalPhotos.length > 0) return assets.finalPhotos;
  if (assets.finalPages.length > 0) {
    return assets.finalPages.flatMap((p: any) => (p.images || []).filter(Boolean));
  }
  const raw = (designData.photos || []).flat(Infinity).filter(Boolean);
  const remote = raw.filter((url: any) => !isLocalUrl(url));
  if (remote.length !== raw.length) {
    console.error(
      `[orderService] Se descartaron ${raw.length - remote.length} URL(s) locales del campo raíz photos ` +
      `(productType sin rama de subida propia).`
    );
  }
  return remote;
}

export interface SaveResult {
  orderId: string;
  /** Equivalencias blob:/data: → URL de Storage, para que el editor no resuba lo ya subido. */
  uploadedUrlMap: Record<string, string>;
}

export async function createDraftOrder(
  userId: string,
  designData: any,
  product: any,
  onProgress?: (progress: number) => void,
  existingOrderId?: string,
  productType?: string,
  status: 'draft' | 'saved_draft' = 'draft',
  userInfo?: { name?: string; email?: string },
  allowShrink = false
): Promise<SaveResult> {
  const orderRef = existingOrderId
    ? doc(db, 'orders', existingOrderId)
    : doc(collection(db, 'orders'));
  const orderId = existingOrderId || orderRef.id;
  const folderPath = `orders/${userId}/${orderId}`;

  const productString = String(product?.type || product?.id || product?.name || '').toLowerCase();

  // Leemos el documento existente ANTES de subir nada: lo necesitamos para la guarda
  // anti-pérdida y para saber si toca crear o actualizar.
  const existingSnap = existingOrderId ? await getDoc(orderRef) : null;
  const existing = existingSnap?.exists() ? existingSnap.data() : null;

  const assets = await processDesignAssets(
    designData, productString, folderPath, designData.uploadedUrlMap || {}, onProgress
  );

  // ── Nunca persistir un hueco donde el usuario tiene una foto ────────────────
  if (assets.failures.length > 0) {
    throw new PhotoUploadError(assets.failures);
  }

  let cleanCustomization = { ...designData.customization };
  if (cleanCustomization.coverContent && cleanCustomization.coverContent.coverImage) {
    cleanCustomization = {
      ...cleanCustomization,
      coverContent: {
        ...cleanCustomization.coverContent,
        coverImage: 'uploaded',
      },
    };
  }

  const safePhotosToSave = buildFlatPhotoList(assets, designData);
  const now = new Date().toISOString();

  const designFields = {
    product,
    productType: productType || productString,
    customization: cleanCustomization,
    coverData: assets.coverData,
    photoCrops: designData.photoCrops || {},
    textBoxSlots: designData.textBoxSlots || {},
    pageLayouts: designData.pageLayouts || {},
    pageLayoutVariants: designData.pageLayoutVariants || {},
    pages: assets.finalPages,
    items: assets.finalItems.length > 0 ? assets.finalItems : (designData.items || []),
    mugItems: assets.finalItems.length > 0 ? assets.finalItems : (designData.mugItems || []),
    photos: safePhotosToSave,
    schemaVersion: SCHEMA_VERSION,
    photoCount: 0, // se rellena justo debajo
    updatedAt: now,
  };
  designFields.photoCount = countPersistedPhotos(designFields);

  // ── Guarda anti-pérdida ────────────────────────────────────────────────────
  if (existing) {
    const before = countPersistedPhotos(existing);
    const after = designFields.photoCount;
    if (before > 0) {
      // Vaciar por completo un pedido con fotos nunca es intencional.
      if (after === 0) throw new PhotoLossError(before, 0);
      if (!allowShrink && before >= 10 && after < before * 0.5) {
        throw new PhotoLossError(before, after);
      }
    }
  }

  if (existing) {
    // `updateDoc` reemplaza por completo cada campo que nombramos y deja intactos
    // los que no nombramos: así no pisamos createdAt, total, shippingAddress ni
    // billingAddress, y a la vez los mapas de crops/layouts se reemplazan de verdad
    // (con setDoc({merge:true}) las claves borradas sobrevivirían).
    const updatePayload: any = { ...designFields };

    // El estado solo puede retroceder a borrador si el pedido aún no avanzó.
    if (!existing.status || ['draft', 'saved_draft'].includes(existing.status)) {
      updatePayload.status = status;
    }
    if (userInfo?.name) updatePayload.customerName = userInfo.name;
    if (userInfo?.email) updatePayload.customerEmail = userInfo.email;

    const finalPayload = sanitizeForFirestore(JSON.parse(JSON.stringify(updatePayload)));
    assertNoLocalUrls(finalPayload);
    await updateDoc(orderRef, finalPayload);
  } else {
    const createPayload = {
      id: orderId,
      userId,
      customerName: userInfo?.name || null,
      customerEmail: userInfo?.email || null,
      status,
      total: 0,
      createdAt: now,
      ...designFields,
    };
    const finalPayload = sanitizeForFirestore(JSON.parse(JSON.stringify(createPayload)));
    assertNoLocalUrls(finalPayload);
    await setDoc(orderRef, finalPayload);
  }

  if (onProgress) onProgress(100);

  return { orderId, uploadedUrlMap: assets.newUrls };
}

export const CUSTOM_ALBUM_PRODUCT_TYPE = 'custom-album';
export const CUSTOM_ALBUM_STATUS = 'custom_pendiente';

export async function createCustomAlbumOrder(
  userId: string,
  size: 'customAlbum20x20' | 'customAlbum30x30' | 'customAlbumRect',
  userInfo?: { name?: string; email?: string }
): Promise<string> {
  const orderRef = doc(collection(db, 'orders'));
  const orderId = orderRef.id;
  const payload = {
    id: orderId,
    userId,
    customerName: userInfo?.name || null,
    customerEmail: userInfo?.email || null,
    status: CUSTOM_ALBUM_STATUS,
    productType: CUSTOM_ALBUM_PRODUCT_TYPE,
    product: { id: 'custom-album', name: 'Álbum Personalizado', type: CUSTOM_ALBUM_PRODUCT_TYPE },
    customAlbumSize: size,
    total: 0,
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(orderRef, sanitizeForFirestore(payload));
  return orderId;
}

export async function getOrder(orderId: string) {
  const docRef = doc(db, 'orders', orderId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

export async function updateOrderAddresses(
  orderId: string,
  addresses: { shippingAddress: any, billingAddress: any },
  total: number,
  status: string = 'pending_payment'
) {
  const docRef = doc(db, 'orders', orderId);
  await updateDoc(docRef, {
    ...addresses,
    total,
    status,
    updatedAt: new Date().toISOString()
  });
}

export async function getUserOrders(userId: string) {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const orders: any[] = [];
  querySnapshot.forEach((doc) => {
    orders.push({ id: doc.id, ...doc.data() });
  });

  return orders;
}

export async function getUserSavedDrafts(userId: string) {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('userId', '==', userId),
    where('status', '==', 'saved_draft'),
    orderBy('updatedAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  const drafts: any[] = [];
  querySnapshot.forEach((doc) => {
    drafts.push({ id: doc.id, ...doc.data() });
  });
  return drafts;
}

export async function deleteSavedDraft(draftId: string): Promise<void> {
  const docRef = doc(db, 'orders', draftId);
  await deleteDoc(docRef);
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  const docRef = doc(db, 'orders', orderId);
  await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
}

export async function updateOrderDesign(
  orderId: string,
  userId: string,
  designData: any,
  onProgress?: (progress: number) => void,
  allowShrink = false
): Promise<SaveResult> {
  const orderRef = doc(db, 'orders', orderId);
  const folderPath = `orders/${userId}/${orderId}`;

  const productSnap = await getDoc(orderRef);
  if (!productSnap.exists()) throw new Error('Order not found');
  const existingData = productSnap.data();
  const productString = String(existingData.productType || existingData.product?.type || '').toLowerCase();

  const assets = await processDesignAssets(
    designData, productString, folderPath, designData.uploadedUrlMap || {}, onProgress
  );

  if (assets.failures.length > 0) {
    throw new PhotoUploadError(assets.failures);
  }

  let cleanCustomization = { ...designData.customization };
  if (cleanCustomization.coverContent && cleanCustomization.coverContent.coverImage) {
    cleanCustomization = {
      ...cleanCustomization,
      coverContent: {
        ...cleanCustomization.coverContent,
        coverImage: 'uploaded',
      },
    };
  }

  const updatePayload: any = {
    coverData: assets.coverData,
    customization: cleanCustomization,
    photoCrops: designData.photoCrops || {},
    textBoxSlots: designData.textBoxSlots || {},
    pageLayouts: designData.pageLayouts || {},
    pageLayoutVariants: designData.pageLayoutVariants || {},
    pages: assets.finalPages,
    items: assets.finalItems.length > 0 ? assets.finalItems : (designData.items || []),
    mugItems: assets.finalItems.length > 0 ? assets.finalItems : (designData.mugItems || []),
    photos: buildFlatPhotoList(assets, designData),
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  updatePayload.photoCount = countPersistedPhotos(updatePayload);

  const before = countPersistedPhotos(existingData);
  const after = updatePayload.photoCount;
  if (before > 0) {
    if (after === 0) throw new PhotoLossError(before, 0);
    if (!allowShrink && before >= 10 && after < before * 0.5) {
      throw new PhotoLossError(before, after);
    }
  }

  const finalPayload = sanitizeForFirestore(JSON.parse(JSON.stringify(updatePayload)));
  assertNoLocalUrls(finalPayload);
  await updateDoc(orderRef, finalPayload);

  if (onProgress) onProgress(100);

  return { orderId, uploadedUrlMap: assets.newUrls };
}

export async function saveCompleteOrder(
  userId: string,
  designData: any,
  orderDetails: any,
  product: any,
  total: number,
  status: string = 'mock_paid'
) {
    const { shippingAddress, billingAddress } = orderDetails;
    const { orderId } = await createDraftOrder(userId, designData, product);
    await updateOrderAddresses(orderId, { shippingAddress, billingAddress }, total, status);
    return orderId;
}
