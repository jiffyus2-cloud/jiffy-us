/**
 * Converts a HEIC/HEIF file to JPEG.
 *
 * Primary path: libheif-js (WASM, supports HEVC) — works in all desktop
 * browsers (Chrome/Firefox/Edge on Windows & macOS).
 * Fallback: canvas — for Safari/iOS where the browser natively decodes HEIC.
 * Final fallback: return the original file rather than crash.
 */
export async function convertFileIfHeic(file: File): Promise<File> {
  const isHeic =
    /\.(heic|heif)$/i.test(file.name) ||
    file.type.includes('heic') ||
    file.type.includes('heif');

  if (!isHeic) return file;

  try {
    return await convertHeicViaLibheif(file);
  } catch (err) {
    console.warn('[HEIC] libheif-js failed, trying canvas fallback:', err);
  }

  try {
    return await convertHeicViaCanvas(file);
  } catch (err) {
    console.error('[HEIC] Canvas fallback also failed, returning original file:', err);
    return file;
  }
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

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('toBlob failed')); return; }
      const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      resolve(new File([blob], name, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.88);
  });
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

  if (!loaded || img.naturalWidth === 0) throw new Error('Browser cannot decode HEIC natively');

  const canvas = document.createElement('canvas');
  const maxDim = 4096;
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > maxDim || h > maxDim) {
    if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
    else { w = Math.round(w * maxDim / h); h = maxDim; }
  }
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('toBlob failed')); return; }
      const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      resolve(new File([blob], name, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.88);
  });
}
