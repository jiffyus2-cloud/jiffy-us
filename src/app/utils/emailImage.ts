import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { convertPhotoFile } from './imageUtils';
import type { EmailBodyFormat } from '../../services/massEmailApi';

/**
 * Imágenes de los correos masivos.
 *
 * Se suben a `email_images/` (lectura pública, escritura solo del dueño: ver
 * storage.rules) y el correo las enlaza por URL. Antes se reducen: una foto de
 * móvil de 5 MB tarda en abrir y algunos clientes de correo la recortan.
 * La limpieza de almacenamiento solo mira `orders/`, así que nunca las borra.
 */

/** Ancho máximo en píxeles (el cuerpo del correo mide 536 px; 2× para pantallas retina). */
export const EMAIL_IMAGE_MAX_WIDTH = 1200;
export const EMAIL_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** Lo que se escribe en el cuerpo del correo para mostrar la imagen. */
export function imageSnippet(url: string, alt: string, format: EmailBodyFormat): string {
  const cleanAlt = alt.replace(/[\[\]\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
  if (format === 'html') {
    const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `<img src="${attr(url)}" alt="${attr(cleanAlt)}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:8px;margin:0 0 16px">`;
  }
  return `![${cleanAlt}](${url})`;
}

/**
 * Inserta `snippet` en `text` en la posición del cursor, en una línea propia
 * (el backend solo reconoce la imagen si ocupa la línea entera).
 */
export function insertOnOwnLine(text: string, start: number, end: number, snippet: string): { text: string; cursor: number } {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const lead = before.length === 0 || before.endsWith('\n') ? '' : '\n';
  const trail = after.length === 0 || after.startsWith('\n') ? '' : '\n';
  const inserted = `${lead}${snippet}${trail}`;
  return { text: before + inserted + after, cursor: before.length + inserted.length };
}

/** Descripción por defecto a partir del nombre del archivo: "foto_album-2.jpg" → "foto album 2". */
export function altFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
}

async function downscale(file: File): Promise<Blob> {
  // GIF animados y SVG se dejan tal cual (el canvas los aplanaría).
  if (/image\/(gif|svg)/.test(file.type)) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, EMAIL_IMAGE_MAX_WIDTH / bitmap.width);
  if (scale === 1 && file.size < 400 * 1024) { bitmap.close(); return file; }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close(); return file; }
  const keepPng = file.type === 'image/png'; // logos con transparencia
  if (!keepPng) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, keepPng ? 'image/png' : 'image/jpeg', 0.85));
  return blob && blob.size < file.size ? blob : file;
}

/** Sube la imagen (ya reducida) y devuelve su URL pública. */
export async function uploadEmailImage(original: File): Promise<string> {
  const file = await convertPhotoFile(original); // HEIC/RAW → JPEG
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  const blob = await downscale(file);
  if (blob.size > EMAIL_IMAGE_MAX_BYTES) throw new Error('La imagen pesa más de 10 MB incluso reducida.');
  const type = blob.type || file.type;
  const ext = type === 'image/png' ? 'png' : type === 'image/gif' ? 'gif' : type === 'image/webp' ? 'webp' : 'jpg';
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const id = Math.random().toString(36).slice(2, 10);
  const path = `email_images/${stamp}-${id}.${ext}`;
  const result = await uploadBytes(storageRef(storage, path), blob, {
    contentType: type,
    cacheControl: 'public, max-age=31536000, immutable',
  });
  return getDownloadURL(result.ref);
}
