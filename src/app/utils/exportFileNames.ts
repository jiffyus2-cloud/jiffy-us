/**
 * Prefijo de los archivos que se descargan al exportar un pedido:
 * `<iniciales>_<tipo>_<fecha>`, p. ej. `JoPe_ALB_20261103`.
 *  - iniciales: 2 primeras letras del nombre + 2 primeras del apellido del cliente.
 *  - tipo: ALB para álbumes, YC para calendarios.
 *  - fecha: última edición del producto (o la de creación si no hay), en formato AAAAMMDD.
 */

export type ExportProductCode = 'ALB' | 'YC';

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** Quita tildes y todo lo que no sea letra, para que el nombre sirva en un archivo. */
const cleanWord = (word: string): string =>
  word.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z]/g, '');

export const getClientInitials = (fullName?: string | null): string => {
  const words = String(fullName || '').trim().split(/\s+/).map(cleanWord).filter(Boolean);
  if (words.length === 0) return 'XX';
  const first = capitalize(words[0].slice(0, 2));
  if (words.length === 1) return first;
  return first + capitalize(words[words.length - 1].slice(0, 2));
};

const pad = (n: number): string => String(n).padStart(2, '0');

export const formatExportDate = (iso?: string | null): string => {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return 'sinfecha';
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
};

export const buildExportPrefix = (params: {
  clientName?: string | null;
  productCode: ExportProductCode;
  lastEditedAt?: string | null;
}): string =>
  [getClientInitials(params.clientName), params.productCode, formatExportDate(params.lastEditedAt)].join('_');
