/**
 * Converts a HEIC/HEIF file to JPEG.
 *
 * Primary path: canvas — el navegador decodifica el HEIC él mismo (Safari/iOS).
 * Es el camino barato: no descarga el WASM y trabaja sobre una imagen ya
 * decodificada por el sistema, escalada a 4096 px como mucho.
 * Fallback: libheif-js (WASM, soporta HEVC) — necesario en Chrome/Firefox/Edge,
 * que no saben decodificar HEIC de forma nativa.
 * Último recurso: devolver el archivo original en vez de romper la carga.
 *
 * IMPORTANTE (iOS): las conversiones se serializan (una cada vez). El camino
 * libheif reserva un ImageData a resolución completa MÁS el lienzo del mismo
 * tamaño (≈100 MB por foto de 12 MP); varias en paralelo — los llamadores
 * convierten en lotes de 5, o el lote entero — agotaban la memoria de Safari,
 * que descarta la pestaña y se lleva por delante TODAS las fotos ya elegidas.
 * Esto ocurría sobre todo al elegir desde «Explorar/Files», que sí entrega el
 * .HEIC original (el carrete suele entregar JPEG ya convertido).
 */

/** Cola global: solo una conversión HEIC viva a la vez, sin importar cómo agrupe el llamante. */
let conversionQueue: Promise<unknown> = Promise.resolve();

function enqueueConversion<T>(task: () => Promise<T>): Promise<T> {
  const run = conversionQueue.then(task, task);
  // La cola nunca debe quedarse en estado rechazado: eso bloquearía las siguientes.
  conversionQueue = run.then(() => undefined, () => undefined);
  return run;
}

/** Libera el búfer del lienzo en cuanto deja de hacer falta (Safari no lo suelta solo). */
function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

const MAX_DIM = 4096;

export async function convertFileIfHeic(file: File): Promise<File> {
  const isHeic =
    /\.(heic|heif)$/i.test(file.name) ||
    file.type.includes('heic') ||
    file.type.includes('heif');

  if (!isHeic) return file;

  return enqueueConversion(async () => {
    try {
      return await convertHeicViaCanvas(file);
    } catch (err) {
      console.warn('[HEIC] El navegador no decodifica HEIC, probando libheif-js:', err);
    }

    try {
      return await convertHeicViaLibheif(file);
    } catch (err) {
      console.error('[HEIC] libheif-js también falló, se devuelve el archivo original:', err);
      return file;
    }
  });
}

async function convertHeicViaLibheif(file: File): Promise<File> {
  // Dynamic import so the WASM is only downloaded when a HEIC file is uploaded
  const libheifModule = await import('libheif-js/wasm-bundle');
  const libheif = (libheifModule as any).default ?? libheifModule;

  const buffer = await file.arrayBuffer();
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(new Uint8Array(buffer));

  if (!images || images.length === 0) throw new Error('No images in HEIC file');

  const image = images[0];
  const w: number = image.get_width();
  const h: number = image.get_height();

  const imageData = new ImageData(w, h);
  await new Promise<void>((resolve, reject) => {
    image.display(imageData, (result: ImageData | null) => {
      if (!result) reject(new Error('HEIC display failed'));
      else resolve();
    });
  });

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.putImageData(imageData, 0, 0);

  try {
    return await new Promise<File>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('toBlob failed')); return; }
        const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        resolve(new File([blob], name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.88);
    });
  } finally {
    releaseCanvas(canvas);
  }
}

async function convertHeicViaCanvas(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  let loaded = false;
  await new Promise<void>((resolve) => {
    img.onload = () => { loaded = true; resolve(); };
    img.onerror = () => resolve();
    img.src = url;
  });
  URL.revokeObjectURL(url);

  if (!loaded || img.naturalWidth === 0) {
    img.src = '';
    throw new Error('Browser cannot decode HEIC natively');
  }

  const canvas = document.createElement('canvas');
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > MAX_DIM || h > MAX_DIM) {
    if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
    else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
  }
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
  img.src = ''; // el bitmap decodificado ya está en el lienzo

  try {
    return await new Promise<File>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('toBlob failed')); return; }
        const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        resolve(new File([blob], name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.88);
    });
  } finally {
    releaseCanvas(canvas);
  }
}
