// ============================================================================
// SALUD DE LAS FOTOS DE UN DISEÑO / PEDIDO
// ============================================================================
// Una foto puede quedar guardada con una URL que no carga (archivo borrado o
// dañado, enlace inválido, formato que el navegador no lee). Antes eso solo se
// notaba como "No se cargó" en pantalla: el cliente guardaba y pagaba sin aviso
// y el PDF salía con huecos. Aquí se comprueba de verdad que cada foto carga y
// se decodifica, para avisar al guardar y antes de generar los PDF.

export interface PhotoRef {
  url: string;
  /** Página del álbum (0-based), posición del calendario, o -1 para la portada. */
  pageIndex: number;
  slotIndex: number;
}

export type PhotoProductKind = 'album' | 'calendar';

export const isLocalPhotoUrl = (url: string) => url.startsWith('blob:') || url.startsWith('data:');

/** Las fotos de un diseño del editor (`photos` por página o por posición, + portada). */
export function collectDesignPhotos(photos: any[] | undefined | null, coverImage: string | undefined | null, kind: PhotoProductKind): PhotoRef[] {
  const refs: PhotoRef[] = [];
  if (typeof coverImage === 'string' && coverImage) refs.push({ url: coverImage, pageIndex: -1, slotIndex: -1 });
  (photos || []).forEach((item, i) => {
    if (kind === 'calendar') {
      const url = Array.isArray(item) ? item[0] : item;
      if (typeof url === 'string' && url) refs.push({ url, pageIndex: i, slotIndex: 0 });
      return;
    }
    const slots = Array.isArray(item) ? item : [item];
    slots.forEach((url, j) => {
      if (typeof url === 'string' && url) refs.push({ url, pageIndex: i, slotIndex: j });
    });
  });
  return refs;
}

/** Álbum o calendario, con la misma detección que el panel y el visor del pedido. */
export function getOrderPhotoKind(order: any): PhotoProductKind {
  const s = String(order?.product?.type || order?.product?.id || order?.product?.name || order?.productType || '').toLowerCase();
  return s.includes('calendar') || s.includes('calendario') || order?.customization?.year !== undefined ? 'calendar' : 'album';
}

/** Las fotos de un pedido guardado en Firestore. */
export function collectOrderPhotos(order: any, kind: PhotoProductKind): PhotoRef[] {
  const cover = kind === 'album' ? order?.coverData?.image : undefined;
  if (kind === 'album') {
    return collectDesignPhotos((order?.pages || []).map((p: any) => p?.images || []), cover, kind);
  }
  return collectDesignPhotos(order?.photos || [], undefined, kind);
}

const listJoin = (items: string[]) =>
  items.length <= 1 ? (items[0] || '') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;

/** "la portada y las páginas 63, 64 y 65" — para los avisos. */
export function describePhotoLocations(refs: PhotoRef[], kind: PhotoProductKind): string {
  const parts: string[] = [];
  if (refs.some(r => r.pageIndex < 0)) parts.push('la portada');
  const pages = Array.from(new Set(refs.filter(r => r.pageIndex >= 0).map(r => r.pageIndex + 1))).sort((a, b) => a - b);
  if (pages.length > 0) {
    const noun = kind === 'calendar' ? (pages.length === 1 ? 'la foto' : 'las fotos') : (pages.length === 1 ? 'la página' : 'las páginas');
    const shown = pages.length > 12 ? [...pages.slice(0, 12).map(String), `${pages.length - 12} más`] : pages.map(String);
    parts.push(`${noun} ${listJoin(shown)}`);
  }
  return listJoin(parts);
}

// ---------------------------------------------------------------------------
// Comprobaciones
// ---------------------------------------------------------------------------
const okCache = new Set<string>();

/**
 * ¿La imagen carga y se decodifica? Los éxitos se recuerdan durante la sesión
 * (no se vuelve a descargar lo ya comprobado); los fallos se reintentan una vez.
 * `crossOrigin`: el PDF carga las fotos en modo CORS, así que el panel las
 * comprueba igual; el editor solo necesita que se vean.
 */
export async function checkImageLoads(
  url: string,
  opts: { crossOrigin?: boolean; timeoutMs?: number; attempts?: number; loader?: typeof loadOnce; sleep?: (ms: number) => Promise<void> } = {},
): Promise<boolean> {
  const key = `${opts.crossOrigin ? 'cors' : 'plain'}|${url}`;
  if (okCache.has(key)) return true;
  const attempts = Math.max(1, opts.attempts ?? 2);
  const load = opts.loader ?? loadOnce;
  const wait = opts.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)));
  for (let attempt = 0; attempt < attempts; attempt++) {
    // Esperas crecientes (0,8 s, 2 s, 4 s…): un error pasajero de Storage o de
    // red se recupera solo en unos segundos.
    if (attempt > 0) await wait(attempt === 1 ? 800 : 2000 * (attempt - 1));
    const ok = await load(url, !!opts.crossOrigin, opts.timeoutMs ?? 30_000);
    if (ok === 'ok') { okCache.add(key); return true; }
    // Tiempo agotado: no hay prueba de que esté rota, se da por buena (se avisa
    // solo de fallos comprobados). El PDF la vuelve a verificar al imprimir.
    if (ok === 'timeout') return true;
  }
  return false;
}

/** Solo para tests. */
export const __clearImageOkCache = () => okCache.clear();

function loadOnce(url: string, crossOrigin: boolean, timeoutMs: number): Promise<'ok' | 'error' | 'timeout'> {
  if (typeof Image === 'undefined') return Promise.resolve('ok');
  return new Promise(resolve => {
    const img = new Image();
    let settled = false;
    const finish = (r: 'ok' | 'error' | 'timeout') => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      img.onload = null; img.onerror = null;
      img.src = '';
      resolve(r);
    };
    const timer = setTimeout(() => finish('timeout'), timeoutMs);
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = async () => {
      try { await img.decode(); } catch { /* naturalWidth decide */ }
      finish(img.naturalWidth > 0 && img.naturalHeight > 0 ? 'ok' : 'error');
    };
    img.onerror = () => finish('error');
    img.src = url;
  });
}

/** Fotos (de `refs`) que no cargan. Comprueba cada URL una sola vez, de pocas en pocas. */
export async function findBrokenPhotos(
  refs: PhotoRef[],
  opts: { crossOrigin?: boolean; concurrency?: number; attempts?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<PhotoRef[]> {
  const urls = Array.from(new Set(refs.map(r => r.url)));
  const broken = new Set<string>();
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < urls.length) {
      const url = urls[next++];
      if (!(await checkImageLoads(url, { crossOrigin: opts.crossOrigin, attempts: opts.attempts }))) broken.add(url);
      opts.onProgress?.(++done, urls.length);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(opts.concurrency ?? 3, urls.length)) }, worker));
  return refs.filter(r => broken.has(r.url));
}

/**
 * ¿El archivo local es una imagen que el navegador puede leer? Evita subir un
 * archivo vacío, dañado o en un formato ilegible (p. ej. un HEIC que no se pudo
 * convertir): se vería como "No se cargó" y saldría en blanco en el PDF.
 * Sin APIs de imagen (tests en Node) no se puede comprobar y se da por bueno.
 */
export async function isDecodableImageBlob(blob: Blob): Promise<boolean> {
  if (!blob || blob.size === 0) return false;
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob);
      const ok = bmp.width > 0 && bmp.height > 0;
      bmp.close();
      return ok;
    } catch {
      // Safari antiguo no decodifica todo vía createImageBitmap: probar con <img>.
    }
  }
  if (typeof Image === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return true;
  const objectUrl = URL.createObjectURL(blob);
  try {
    return (await loadOnce(objectUrl, false, 60_000)) !== 'error';
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
