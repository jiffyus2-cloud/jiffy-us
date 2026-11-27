// ============================================================================
// CAPTURA SEGURA PARA LOS PDF DE IMPRESIÓN (OwnerDashboard)
// ============================================================================
// Los PDF se arman pintando cada página en un contenedor fuera de pantalla y
// fotografiándolo con html-to-image. En equipos con poca memoria, y muy a menudo
// en Safari, esa foto salía con huecos: fotos en blanco o el gris del marco,
// porque (a) la espera tenía un tope tras el cual se capturaba igual, (b) los
// errores de carga se daban por "listos", y (c) el navegador, sin memoria,
// devuelve lienzos vacíos en silencio en lugar de fallar.
//
// Regla de este módulo: una página solo entra al PDF si se comprobó, píxel a
// píxel en una muestra reducida, que cada foto aparece en la captura. Si no, se
// reintenta con un perfil más ligero y más lento; si aun así falla, se lanza un
// error y el PDF NO se entrega. Prioridad: calidad, no velocidad.

import { getCoverDimensions } from './cropMath';

export interface CropLike { x?: number; y?: number; zoom?: number; rotation?: number }

export class IncompleteRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IncompleteRenderError';
  }
}

// ---------------------------------------------------------------------------
// Perfiles de captura
// ---------------------------------------------------------------------------
export interface CaptureProfile {
  name: 'normal' | 'safe';
  /** Sobremuestreo de los lienzos de foto respecto a los 300 ppp finales. */
  cropperScale: number;
  /** Tiempo máximo (con la pestaña visible) esperando a que las fotos se pinten. */
  readyTimeoutMs: number;
  /** Tiempo máximo (con la pestaña visible) para una captura de html-to-image. */
  captureTimeoutMs: number;
  /** Respiro extra tras pintar, antes de capturar (deja decodificar a Safari). */
  settleMs: number;
  /** Pausa entre páginas para que el navegador libere memoria y no se congele. */
  pauseBetweenPagesMs: number;
  /** Captura de calentamiento descartada (Safari no decodifica a la primera). */
  warmupCapture: boolean;
}

export const NORMAL_PROFILE: CaptureProfile = {
  name: 'normal',
  cropperScale: 2,
  readyTimeoutMs: 45_000,
  captureTimeoutMs: 90_000,
  settleMs: 150,
  pauseBetweenPagesMs: 30,
  warmupCapture: false,
};

export const SAFE_PROFILE: CaptureProfile = {
  name: 'safe',
  // 1× ya es exactamente la resolución de salida (pixelRatio 1 a 300 ppp): no se
  // pierde nitidez en el PDF, y cada lienzo ocupa la cuarta parte de memoria.
  cropperScale: 1,
  readyTimeoutMs: 120_000,
  captureTimeoutMs: 240_000,
  settleMs: 600,
  pauseBetweenPagesMs: 400,
  warmupCapture: false,
};

export interface DeviceAssessment {
  lowResources: boolean;
  isSafari: boolean;
  reasons: string[];
}

export function assessDevice(): DeviceAssessment {
  const nav: any = typeof navigator !== 'undefined' ? navigator : {};
  const ua = String(nav.userAgent || '');
  // Safari de verdad (incluye todo navegador de iOS, que usa WebKit).
  const isSafari = /AppleWebKit/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/i.test(ua) || /iPad|iPhone|iPod/i.test(ua);
  const reasons: string[] = [];
  if (isSafari) reasons.push('Safari');
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) reasons.push(`${nav.deviceMemory} GB de RAM`);
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) reasons.push(`${nav.hardwareConcurrency} núcleos`);
  const conn = nav.connection;
  if (conn && (conn.saveData || /(^|-)2g$/.test(String(conn.effectiveType || '')))) reasons.push('conexión lenta');
  return { lowResources: reasons.length > 0, isSafari, reasons };
}

export function initialProfileFor(device: DeviceAssessment): CaptureProfile {
  if (!device.lowResources) return NORMAL_PROFILE;
  return { ...SAFE_PROFILE, warmupCapture: device.isSafari };
}

/** Perfil para el reintento `attempt` (0 = primer intento). Cada vez más lento y ligero. */
export function profileForAttempt(base: CaptureProfile, attempt: number, device: DeviceAssessment): CaptureProfile {
  if (attempt === 0) return base;
  const factor = Math.min(attempt, 4);
  return {
    ...SAFE_PROFILE,
    readyTimeoutMs: SAFE_PROFILE.readyTimeoutMs + 30_000 * factor,
    captureTimeoutMs: SAFE_PROFILE.captureTimeoutMs + 60_000 * factor,
    settleMs: SAFE_PROFILE.settleMs + 700 * factor,
    pauseBetweenPagesMs: SAFE_PROFILE.pauseBetweenPagesMs + 800 * factor,
    // Desde el segundo reintento se descarta siempre una captura de calentamiento.
    warmupCapture: device.isSafari || attempt >= 2,
  };
}

// ---------------------------------------------------------------------------
// Utilidades de tiempo (cuentan solo mientras la pestaña está visible: el
// navegador pausa las pestañas ocultas y eso no debe contarse como un fallo)
// ---------------------------------------------------------------------------
export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** Cede el hilo al navegador (pinta la barra de progreso, deja correr el GC). */
export const yieldToBrowser = (ms = 0) => sleep(ms);

/** Siguiente fotograma, sin colgarse si la pestaña está oculta (rAF no corre ahí). */
const nextFrame = () => new Promise<void>(resolve => {
  let done = false;
  const finish = () => { if (!done) { done = true; resolve(); } };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => finish());
  setTimeout(finish, 120);
});

/**
 * Espera `promise` con un límite que solo avanza con la pestaña visible.
 * Si se agota, rechaza: nunca se sigue adelante "a ciegas".
 */
export function withVisibleTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let elapsed = 0;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      if (typeof document === 'undefined' || !document.hidden) elapsed += now - last;
      last = now;
      if (elapsed > ms) {
        clearInterval(timer);
        reject(new IncompleteRenderError(`Tiempo agotado: ${what}`));
      }
    }, 250);
    promise.then(
      v => { clearInterval(timer); resolve(v); },
      e => { clearInterval(timer); reject(e); },
    );
  });
}

// ---------------------------------------------------------------------------
// Precarga de imágenes
// ---------------------------------------------------------------------------
async function fetchImageBlob(url: string, attempts = 3): Promise<Blob> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { mode: 'cors', cache: i === 0 ? 'force-cache' : 'reload' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (blob.size === 0) throw new Error('imagen vacía');
      if (blob.type && !blob.type.startsWith('image/') && blob.type !== 'application/octet-stream') {
        throw new Error(`tipo inesperado ${blob.type}`);
      }
      return blob;
    } catch (err) {
      lastError = err;
      await sleep(600 * (i + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export interface PreloadedImages {
  map: Record<string, string>;
  /** Libera las URLs de objeto creadas (llamar al terminar la página). */
  release: () => void;
}

/**
 * Descarga las imágenes de una página antes de pintarla.
 * - `objectUrl`: ideal para los lienzos de foto; no duplica la imagen en un
 *   string base64 (≈ 1,33× su peso) y se libera al terminar la página.
 * - `dataUrl`: necesario cuando html-to-image debe incrustar un <img> (portada).
 * Las descargas van de una en una en modo seguro para no disparar la memoria.
 * Si una descarga falla tras los reintentos se deja la URL original: el lienzo
 * intentará cargarla y, si tampoco puede, la página se marcará como incompleta.
 */
export async function preloadImagesStrict(urls: string[], as: 'objectUrl' | 'dataUrl', sequential: boolean): Promise<PreloadedImages> {
  const created: string[] = [];
  const map: Record<string, string> = {};
  const unique = Array.from(new Set(urls.filter(Boolean)));

  const loadOne = async (url: string) => {
    if (url.startsWith('data:') || url.startsWith('blob:')) { map[url] = url; return; }
    try {
      const blob = await fetchImageBlob(url);
      if (as === 'objectUrl') {
        const objectUrl = URL.createObjectURL(blob);
        created.push(objectUrl);
        map[url] = objectUrl;
      } else {
        map[url] = await blobToDataUrl(blob);
      }
    } catch (err) {
      console.warn('[PDF] No se pudo precargar la imagen, se usará la URL original:', url, err);
      map[url] = url;
    }
  };

  if (sequential) {
    for (const url of unique) await loadOne(url);
  } else {
    await Promise.all(unique.map(loadOne));
  }

  return {
    map,
    release: () => { created.forEach(u => URL.revokeObjectURL(u)); created.length = 0; },
  };
}

// ---------------------------------------------------------------------------
// Dibujo de una foto recortada (misma matemática que ImageCropper)
// ---------------------------------------------------------------------------
export function drawCroppedImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number },
  destWidth: number,
  destHeight: number,
  crop: CropLike | undefined,
): void {
  const imgWidth = (img as any).naturalWidth || (img as any).width;
  const imgHeight = (img as any).naturalHeight || (img as any).height;
  const { x = 50, y = 50, zoom = 1, rotation = 0 } = crop || {};

  // Se dibuja la imagen entera en un destino calculado (y no un rectángulo
  // recortado dentro de ella): es la única forma de representar zoom < 1.
  const { Rw, Rh } = getCoverDimensions(destWidth, destHeight, imgWidth, imgHeight);
  const drawWidth = Rw * zoom;
  const drawHeight = Rh * zoom;
  const dX = destWidth / 2 - (x / 100) * Rw * zoom;
  const dY = destHeight / 2 - (y / 100) * Rh * zoom;

  // El hueco que deja un zoom < 1 es blanco intencional, igual que en pantalla.
  ctx.clearRect(0, 0, destWidth, destHeight);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, destWidth, destHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (rotation !== 0) {
    ctx.save();
    ctx.translate(destWidth / 2, destHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-destWidth / 2, -destHeight / 2);
  }
  ctx.drawImage(img, 0, 0, imgWidth, imgHeight, dX, dY, drawWidth, drawHeight);
  if (rotation !== 0) ctx.restore();
}

/**
 * ¿El lienzo quedó realmente pintado? Si el navegador no tuvo memoria para
 * reservarlo, Safari/Chrome devuelven un lienzo transparente sin avisar: como
 * siempre se rellena de blanco antes de dibujar, alfa 0 significa "no existe".
 */
export function canvasLooksAllocated(canvas: HTMLCanvasElement): boolean {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width === 0 || canvas.height === 0) return false;
    const pts: Array<[number, number]> = [
      [0, 0], [canvas.width - 1, 0], [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1],
      [Math.floor(canvas.width / 2), Math.floor(canvas.height / 2)],
    ];
    return pts.every(([px, py]) => ctx.getImageData(px, py, 1, 1).data[3] === 255);
  } catch {
    return false;
  }
}

/** Libera la memoria de los lienzos de un contenedor (Safari no lo hace solo a tiempo). */
export function releaseCanvases(root: ParentNode | null | undefined): void {
  if (!root) return;
  root.querySelectorAll('canvas').forEach(c => { c.width = 0; c.height = 0; });
}

// ---------------------------------------------------------------------------
// Espera estricta a que la página esté pintada
// ---------------------------------------------------------------------------
const CROPPER_SELECTOR = '[data-canvas-cropper], [data-image-cropper]';

/**
 * Espera a que todas las fotos estén dibujadas. A diferencia de la espera
 * anterior, NO captura al agotarse el tiempo ni da por buena una foto con
 * error: en ambos casos lanza `IncompleteRenderError` para que se reintente.
 * `expectedPhotos` (si se conoce) evita dar por lista una página a la que aún
 * le faltan marcos por montar.
 */
export async function waitForRenderReadyStrict(container: HTMLElement, profile: CaptureProfile, expectedPhotos?: number): Promise<void> {
  const MIN_WAIT_MS = 150;
  const start = Date.now();

  await withVisibleTimeout(new Promise<void>((resolve, reject) => {
    const poll = setInterval(() => {
      const targets = Array.from(container.querySelectorAll<HTMLElement>(CROPPER_SELECTOR));
      const failed = targets.filter(t => t.getAttribute('data-ready') === 'error');
      if (failed.length > 0) {
        clearInterval(poll);
        reject(new IncompleteRenderError(`${failed.length} foto(s) no se pudieron cargar o dibujar`));
        return;
      }
      const allDone = targets.length >= (expectedPhotos ?? 0) && targets.every(t => t.getAttribute('data-ready') === 'true');
      if (allDone && Date.now() - start >= MIN_WAIT_MS) {
        clearInterval(poll);
        resolve();
      }
    }, 100);
  }), profile.readyTimeoutMs, 'las fotos de la página no terminaron de pintarse');

  // Resto de imágenes (logo, fotos de portada): cargadas y decodificadas.
  const imgs = Array.from(container.querySelectorAll('img'));
  await withVisibleTimeout(Promise.all(imgs.map(async img => {
    // Nombrar la imagen en el error: "una imagen está vacía" no decía si era la
    // foto o el logo, y costó saber qué fallaba (pedido PL8ZbHMd).
    const which = describeImg(img);
    if (!img.complete) {
      await new Promise<void>((resolve, reject) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => reject(new IncompleteRenderError(`${which} no cargó`)), { once: true });
      });
    }
    if (img.naturalWidth === 0) throw new IncompleteRenderError(`${which} está vacía`);
    try { await img.decode(); } catch { /* algunos navegadores rechazan decode() de SVG ya pintados */ }
  })), profile.readyTimeoutMs, 'las imágenes de la página no se decodificaron');

  if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
    await withVisibleTimeout((document as any).fonts.ready, profile.readyTimeoutMs, 'las fuentes no cargaron');
  }

  await nextFrame();
  await nextFrame();
  if (profile.settleMs > 0) await sleep(profile.settleMs);
}

// ---------------------------------------------------------------------------
// Verificación de la captura
// ---------------------------------------------------------------------------
/** "la imagen «logo de la contraportada»" / "una imagen de la página (…/archivo.svg)". */
export function describeImg(img: { alt?: string; src?: string; getAttribute?: (n: string) => string | null }): string {
  const alt = (img.alt || '').trim();
  if (alt) return `la imagen «${alt}»`;
  const src = String(img.getAttribute?.('src') ?? img.src ?? '');
  if (!src) return 'una imagen de la página (sin dirección)';
  if (src.startsWith('data:')) return 'una imagen de la página (incrustada)';
  const name = src.split('?')[0].split('/').pop() || src;
  return `una imagen de la página (${name.length > 60 ? `${name.slice(0, 60)}…` : name})`;
}

const SAMPLE = 96;  // muestra reducida de cada foto
const CELLS = 24;   // rejilla de comprobación (celdas de 4×4 px de la muestra)
const CELL = SAMPLE / CELLS;

interface CellStats { mean: Float32Array; std: Float32Array }

function sampleStats(source: CanvasImageSource, sx: number, sy: number, sw: number, sh: number): CellStats | null {
  const c = document.createElement('canvas');
  c.width = SAMPLE; c.height = SAMPLE;
  const ctx = c.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, SAMPLE, SAMPLE);
  const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
  c.width = 0; c.height = 0;
  const mean = new Float32Array(CELLS * CELLS);
  const std = new Float32Array(CELLS * CELLS);
  for (let cy = 0; cy < CELLS; cy++) {
    for (let cx = 0; cx < CELLS; cx++) {
      let sum = 0, sum2 = 0, n = 0;
      for (let py = cy * CELL; py < (cy + 1) * CELL; py++) {
        for (let px = cx * CELL; px < (cx + 1) * CELL; px++) {
          const i = (py * SAMPLE + px) * 4;
          // Transparente = sin pintar: se cuenta como negro puro para que nunca
          // pase por una foto.
          const a = data[i + 3] / 255;
          const lum = a * (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          sum += lum; sum2 += lum * lum; n++;
        }
      }
      const m = sum / n;
      mean[cy * CELLS + cx] = m;
      std[cy * CELLS + cx] = Math.sqrt(Math.max(0, sum2 / n - m * m));
    }
  }
  return { mean, std };
}

/**
 * Fracción de celdas "perdidas": en la captura la celda es plana (sin detalle)
 * mientras en la foto de referencia hay detalle, o es plana pero de otro tono
 * (el gris del marco, blanco, negro). Solo se miran las celdas centrales para
 * no confundir máscaras de forma ni bordes. Se prueba también la referencia
 * girada 180° (la hoja de foto del calendario de pared va girada por CSS).
 */
function missingFraction(cap: CellStats, ref: CellStats): number {
  const lo = Math.floor(CELLS * 0.15);
  const hi = Math.ceil(CELLS * 0.85);
  let best = Infinity;
  for (const rotated of [false, true]) {
    let missing = 0, total = 0;
    for (let y = lo; y < hi; y++) {
      for (let x = lo; x < hi; x++) {
        const ci = y * CELLS + x;
        const ri = rotated ? (CELLS - 1 - y) * CELLS + (CELLS - 1 - x) : ci;
        total++;
        const capFlat = cap.std[ci] < 1.5;
        if (!capFlat) continue;
        const refHasDetail = ref.std[ri] > 6;
        const toneDiffers = Math.abs(cap.mean[ci] - ref.mean[ri]) > 40;
        if (refHasDetail || toneDiffers) missing++;
      }
    }
    best = Math.min(best, missing / Math.max(total, 1));
  }
  return best;
}

function parseCrop(el: Element): CropLike | undefined {
  try { return JSON.parse(el.getAttribute('data-crop') || 'null') || undefined; } catch { return undefined; }
}

/**
 * Comprueba que cada foto de `node` aparezca en `captured`.
 * Devuelve null si todo está bien, o el motivo del fallo.
 */
export function verifyCapture(captured: HTMLCanvasElement, node: HTMLElement, expectedW: number, expectedH: number): string | null {
  if (captured.width !== expectedW || captured.height !== expectedH) {
    return `la captura salió de ${captured.width}×${captured.height} px en lugar de ${expectedW}×${expectedH}`;
  }
  if (!canvasLooksAllocated(captured)) return 'el navegador no pudo reservar memoria para la página';

  const nodeRect = node.getBoundingClientRect();
  const scaleX = expectedW / (nodeRect.width || expectedW);
  const scaleY = expectedH / (nodeRect.height || expectedH);
  const targets = Array.from(node.querySelectorAll<HTMLElement>(CROPPER_SELECTOR));

  for (let i = 0; i < targets.length; i++) {
    const el = targets[i];
    const r = el.getBoundingClientRect();
    const x = Math.max(0, (r.left - nodeRect.left) * scaleX);
    const y = Math.max(0, (r.top - nodeRect.top) * scaleY);
    const w = Math.min(expectedW - x, r.width * scaleX);
    const h = Math.min(expectedH - y, r.height * scaleY);
    if (w < 8 || h < 8) continue;

    let ref: CellStats | null = null;
    let tolerance: number;
    if (el instanceof HTMLCanvasElement) {
      if (!canvasLooksAllocated(el)) return `la foto ${i + 1} no se pudo dibujar (memoria insuficiente)`;
      ref = sampleStats(el, 0, 0, el.width, el.height);
      tolerance = 0.12;
    } else {
      // ImageCropper (portada): se reconstruye el recorte visible en pequeño.
      const img = el.querySelector('img');
      if (!img || img.naturalWidth === 0) return `la foto ${i + 1} no cargó`;
      const refCanvas = document.createElement('canvas');
      const aspect = r.width / r.height;
      refCanvas.width = aspect >= 1 ? 384 : Math.max(8, Math.round(384 * aspect));
      refCanvas.height = aspect >= 1 ? Math.max(8, Math.round(384 / aspect)) : 384;
      const rctx = refCanvas.getContext('2d');
      if (!rctx) return 'no hay memoria para verificar la página';
      drawCroppedImage(rctx, img, refCanvas.width, refCanvas.height, parseCrop(el));
      ref = sampleStats(refCanvas, 0, 0, refCanvas.width, refCanvas.height);
      refCanvas.width = 0; refCanvas.height = 0;
      // La portada puede llevar el título encima de la foto: más margen.
      tolerance = 0.3;
    }
    const cap = sampleStats(captured, x, y, w, h);
    if (!ref || !cap) return 'no hay memoria para verificar la página';
    const missing = missingFraction(cap, ref);
    if (missing > tolerance) {
      return `la foto ${i + 1} salió incompleta en la captura (${Math.round(missing * 100)}% en blanco)`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Captura verificada → bytes JPEG
// ---------------------------------------------------------------------------
export interface VerifiedCapture { bytes: Uint8Array; width: number; height: number }

type ToCanvas = (node: HTMLElement, options: Record<string, unknown>) => Promise<HTMLCanvasElement>;

export async function captureVerifiedJpeg(
  toCanvas: ToCanvas,
  node: HTMLElement,
  expectedW: number,
  expectedH: number,
  profile: CaptureProfile,
  options: { quality: number; fontEmbedCSS?: string },
): Promise<VerifiedCapture> {
  const capOpts: Record<string, unknown> = {
    pixelRatio: 1,
    width: expectedW,
    height: expectedH,
    canvasWidth: expectedW,
    canvasHeight: expectedH,
    backgroundColor: '#ffffff',
    cacheBust: false,
    ...(options.fontEmbedCSS ? { fontEmbedCSS: options.fontEmbedCSS } : {}),
  };

  if (profile.warmupCapture) {
    try {
      const warm = await withVisibleTimeout(toCanvas(node, capOpts), profile.captureTimeoutMs, 'la captura de calentamiento');
      warm.width = 0; warm.height = 0;
    } catch { /* solo calienta la caché de decodificación */ }
    await sleep(profile.settleMs);
  }

  const canvas = await withVisibleTimeout(toCanvas(node, capOpts), profile.captureTimeoutMs, 'la captura de la página');
  try {
    const problem = verifyCapture(canvas, node, expectedW, expectedH);
    if (problem) throw new IncompleteRenderError(problem);

    const blob = await withVisibleTimeout(new Promise<Blob | null>(resolve => {
      try { canvas.toBlob(resolve, 'image/jpeg', options.quality); } catch { resolve(null); }
    }), profile.captureTimeoutMs, 'la compresión JPEG de la página');
    if (!blob || blob.size < 1024) throw new IncompleteRenderError('el navegador no pudo comprimir la página (memoria insuficiente)');

    const bytes = new Uint8Array(await blob.arrayBuffer());
    // Firma JPEG (FF D8 … FF D9): un archivo truncado no entra al PDF.
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
      throw new IncompleteRenderError('la imagen de la página quedó truncada');
    }
    return { bytes, width: canvas.width, height: canvas.height };
  } finally {
    canvas.width = 0; canvas.height = 0;
  }
}
