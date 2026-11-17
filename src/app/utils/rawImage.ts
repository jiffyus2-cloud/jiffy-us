// ============================================================================
// FOTOS RAW (DNG, CR2, CR3, NEF, ARW, RAF, ORF, RW2…) → JPEG EN EL NAVEGADOR
// ============================================================================
// Ningún navegador sabe mostrar un RAW: se veía como "No se cargó" y salía en
// blanco en el PDF. El RAW nunca se sube al servidor; se convierte aquí.
//
// Cómo: casi todas las cámaras guardan DENTRO del RAW una copia JPEG ya
// revelada por la propia cámara (la que se ve en su pantalla), normalmente a
// tamaño completo o casi. Se localizan todas las JPEG incrustadas, se elige la
// más grande que el navegador sepa decodificar, se le aplica la orientación de
// la cámara y se guarda como JPEG. Es rápido, no descarga nada extra y los
// colores son los de la cámara. No se intenta revelar los datos del sensor.

export const RAW_EXTENSIONS = [
  'dng', 'cr2', 'cr3', 'crw', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'raf', 'orf',
  'rw2', 'raw', 'rwl', 'pef', 'srw', '3fr', 'fff', 'iiq', 'erf', 'mrw', 'mos',
  'kdc', 'dcr', 'x3f',
];

/** Para los `accept` de los selectores de archivo. */
export const RAW_ACCEPT = RAW_EXTENSIONS.map(e => `.${e}`).join(',');

const RAW_EXT_RE = new RegExp(`\\.(${RAW_EXTENSIONS.join('|')})$`, 'i');
const RAW_MIME_RE = /^image\/(x-)?(dng|adobe-dng|canon-cr[23w]|nikon-nef|nikon-nrw|sony-arw|sony-sr[f2]|fuji-raf|olympus-orf|panasonic-rw2|panasonic-raw|pentax-pef|samsung-srw|leica-rwl|hasselblad-3fr|phaseone-iiq|epson-erf|minolta-mrw|kodak-(kdc|dcr)|sigma-x3f|raw)$/i;

export function isRawFile(file: { name: string; type: string }): boolean {
  return RAW_EXT_RE.test(file.name) || RAW_MIME_RE.test(file.type || '');
}

// ---------------------------------------------------------------------------
// JPEG incrustadas
// ---------------------------------------------------------------------------
export interface EmbeddedJpeg {
  start: number;
  /** Exclusivo. */
  end: number;
  width: number;
  height: number;
  /** Orientación EXIF propia de la JPEG (si la trae), 1–8. */
  orientation: number | null;
}

const u16 = (b: Uint8Array, p: number, le: boolean) => le ? b[p] | (b[p + 1] << 8) : (b[p] << 8) | b[p + 1];
const u32 = (b: Uint8Array, p: number, le: boolean) =>
  (le ? (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) : ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3])) >>> 0;

/** Etiqueta Orientation (0x0112) del IFD0 de una cabecera TIFF en `off`. */
export function readTiffOrientation(b: Uint8Array, off: number): number | null {
  if (off < 0 || off + 8 > b.length) return null;
  let le: boolean;
  if (b[off] === 0x49 && b[off + 1] === 0x49) le = true;       // "II"
  else if (b[off] === 0x4d && b[off + 1] === 0x4d) le = false; // "MM"
  else return null;
  const ifd = off + u32(b, off + 4, le);
  if (ifd + 2 > b.length) return null;
  const count = u16(b, ifd, le);
  for (let i = 0; i < count; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > b.length) return null;
    if (u16(b, e, le) === 0x0112) {
      const v = u16(b, e + 8, le);
      return v >= 1 && v <= 8 ? v : null;
    }
  }
  return null;
}

/**
 * Recorre una JPEG que empieza en `start` siguiendo sus segmentos (así las
 * miniaturas metidas en el EXIF no se confunden con la imagen) y devuelve su
 * final y tamaño. null si no es una JPEG válida o no es decodificable por un
 * navegador (las JPEG "lossless" que usan CR2/DNG para los datos del sensor).
 */
function parseJpegAt(b: Uint8Array, start: number): EmbeddedJpeg | null {
  let p = start + 2;
  let width = 0, height = 0, decodable = false;
  let orientation: number | null = null;
  // (La JPEG puede terminar justo al final del archivo: basta con que quepa el marcador.)
  while (p + 1 < b.length) {
    if (b[p] !== 0xff) return null;
    while (p < b.length && b[p] === 0xff) p++; // relleno
    if (p >= b.length) return null;
    const m = b[p];
    p++;
    if (m === 0xd9) {
      return decodable && width > 0 && height > 0 ? { start, end: p, width, height, orientation } : null;
    }
    if ((m >= 0xd0 && m <= 0xd7) || m === 0x01) continue;
    if (p + 2 > b.length) return null;
    const len = (b[p] << 8) | b[p + 1];
    if (len < 2 || p + len > b.length) return null;
    const seg = p + 2;
    if (m === 0xc0 || m === 0xc1 || m === 0xc2) {
      height = (b[seg + 1] << 8) | b[seg + 2];
      width = (b[seg + 3] << 8) | b[seg + 4];
      decodable = true;
    } else if (m >= 0xc3 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return null; // lossless / jerárquica / aritmética: no la decodifica un navegador
    } else if (m === 0xe1 && orientation === null && b[seg] === 0x45 && b[seg + 1] === 0x78 && b[seg + 2] === 0x69 && b[seg + 3] === 0x66) {
      orientation = readTiffOrientation(b, seg + 6); // "Exif\0\0" + TIFF
    }
    p += len;
    if (m === 0xda) {
      // Datos comprimidos: termina en el primer FF que no sea relleno (FF 00) ni RST.
      while (p + 1 < b.length) {
        if (b[p] === 0xff && b[p + 1] !== 0x00 && !(b[p + 1] >= 0xd0 && b[p + 1] <= 0xd7)) break;
        p++;
      }
    }
  }
  return null;
}

/** Todas las JPEG decodificables incrustadas en el archivo, de mayor a menor. */
export function findEmbeddedJpegs(b: Uint8Array): EmbeddedJpeg[] {
  const found: EmbeddedJpeg[] = [];
  let i = 0;
  while (i + 3 < b.length) {
    if (b[i] === 0xff && b[i + 1] === 0xd8 && b[i + 2] === 0xff) {
      const jpg = parseJpegAt(b, i);
      if (jpg) {
        found.push(jpg);
        i = jpg.end;
        continue;
      }
    }
    i++;
  }
  return found.sort((a, z) => z.width * z.height - a.width * a.height);
}

/** Orientación que guarda la cámara en el contenedor RAW (TIFF o CR3). */
export function readRawOrientation(b: Uint8Array): number | null {
  // TIFF: CR2, NEF, ARW, DNG, PEF, SRW… ("II*\0" / "MM\0*"); ORF ("IIRO"), RW2 ("IIU\0").
  const tiff = readTiffOrientation(b, 0);
  if (tiff) return tiff;
  // CR3 (ISO BMFF): el IFD0 va en la caja CMT1.
  const limit = Math.min(b.length - 4, 512 * 1024);
  for (let i = 4; i < limit; i++) {
    if (b[i] === 0x43 && b[i + 1] === 0x4d && b[i + 2] === 0x54 && b[i + 3] === 0x31) { // "CMT1"
      return readTiffOrientation(b, i + 4);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Conversión
// ---------------------------------------------------------------------------
/** Por debajo de esto la vista previa no sirve para imprimir: mejor pedir un JPG. */
const MIN_LONG_SIDE = 1200;

export class RawConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RawConversionError';
  }
}

async function decodeJpeg(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      // 'from-image': aplica la orientación EXIF de la propia JPEG, si la trae.
      const bmp = await createImageBitmap(blob);
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch { /* probar con <img> */ }
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new RawConversionError('la vista previa incrustada no se pudo decodificar'));
      img.src = url;
    });
    await img.decode().catch(() => undefined);
  } finally {
    URL.revokeObjectURL(url);
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => { img.src = ''; } };
}

/** Coloca el lienzo para dibujar con la orientación EXIF `o` (1–8). */
function applyOrientation(ctx: CanvasRenderingContext2D, o: number, w: number, h: number) {
  switch (o) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, h, w); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
    default: break;
  }
}

/**
 * Convierte un RAW en JPEG a partir de su vista previa incrustada.
 * Lanza `RawConversionError` si el archivo no trae una vista previa utilizable.
 */
export async function convertRawToJpeg(file: File, maxDim = 4096, quality = 0.92): Promise<File> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const candidates = findEmbeddedJpegs(bytes);
  const best = candidates[0];
  if (!best) throw new RawConversionError('el archivo RAW no trae una imagen de vista previa');
  if (Math.max(best.width, best.height) < MIN_LONG_SIDE) {
    throw new RawConversionError(`la vista previa del RAW es muy pequeña (${best.width}×${best.height} px)`);
  }

  // Si la JPEG no trae orientación propia, se usa la que guardó la cámara en el RAW.
  const rawOrientation = best.orientation === null ? (readRawOrientation(bytes) ?? 1) : 1;
  const jpegBlob = new Blob([bytes.subarray(best.start, best.end)], { type: 'image/jpeg' });

  const decoded = await decodeJpeg(jpegBlob);
  const canvas = document.createElement('canvas');
  try {
    let w = decoded.width, h = decoded.height;
    if (w === 0 || h === 0) throw new RawConversionError('la vista previa incrustada está vacía');
    const scale = Math.min(1, maxDim / Math.max(w, h));
    w = Math.round(w * scale); h = Math.round(h * scale);
    const swap = rawOrientation >= 5;
    canvas.width = swap ? h : w;
    canvas.height = swap ? w : h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new RawConversionError('no hay memoria para convertir la foto');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    applyOrientation(ctx, rawOrientation, w, h);
    ctx.drawImage(decoded.source, 0, 0, w, h);

    const out = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!out || out.size === 0) throw new RawConversionError('no se pudo generar el JPEG');
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([out], name, { type: 'image/jpeg', lastModified: file.lastModified });
  } finally {
    decoded.release();
    canvas.width = 0; canvas.height = 0;
  }
}
