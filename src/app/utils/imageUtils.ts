/**
 * Converts a HEIC/HEIF file to JPEG.
 * Uses heic2any (pure-JS decoder) as primary path so it works on all desktop
 * browsers (Chrome/Firefox/Edge on Windows & macOS), with a canvas fallback
 * for Safari/iOS where the browser already decodes HEIC natively.
 */
export async function convertFileIfHeic(file: File): Promise<File> {
  const isHeic =
    /\.(heic|heif)$/i.test(file.name) ||
    file.type.includes('heic') ||
    file.type.includes('heif');

  if (!isHeic) return file;

  try {
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.88 });
    const blob = Array.isArray(result) ? result[0] : result;
    const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    // Fallback: canvas path works on Safari/iOS that natively supports HEIC decoding
    return convertHeicViaCanvas(file);
  }
}

async function convertHeicViaCanvas(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
  URL.revokeObjectURL(url);

  const canvas = document.createElement('canvas');
  const maxDim = 4096;
  let w = img.naturalWidth || 1;
  let h = img.naturalHeight || 1;
  if (w > maxDim || h > maxDim) {
    if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
    else { w = Math.round(w * maxDim / h); h = maxDim; }
  }
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);

  return new Promise<File>((resolve) => {
    canvas.toBlob((blob) => {
      const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      resolve(blob ? new File([blob], name, { type: 'image/jpeg' }) : file);
    }, 'image/jpeg', 0.88);
  });
}
