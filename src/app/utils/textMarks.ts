// ============================================================================
// Text Marks
// ============================================================================
// Negrilla e itálica POR CARÁCTER en las cajas de texto del álbum.
//
// El texto sigue guardándose como una cadena plana (`textBox.text`), igual que
// antes: el límite de caracteres, el modo "encoger" y los borradores viejos no
// cambian. El estilo va aparte, en `textBox.marks`: una cadena de la MISMA
// longitud que el texto con un dígito por carácter:
//
//   '0' normal · '1' negrilla · '2' itálica · '3' negrilla + itálica
//
// Una caja sin estilos guarda `marks: ''` (nunca `undefined`: Firestore rechaza
// campos undefined). Si `marks` es más corta que el texto —borradores antiguos,
// o un recorte por límite de caracteres—, lo que falta cuenta como normal.
// ============================================================================

export const MARK_BOLD = 1;
export const MARK_ITALIC = 2;

export interface TextSegment {
  text: string;
  mark: number;
}

/** Estilo del carácter `i` (0 si no hay dato). */
export function markAt(marks: string | undefined, i: number): number {
  const c = marks?.charCodeAt(i);
  return c !== undefined && c >= 48 && c <= 51 ? c - 48 : 0;
}

/**
 * Deja `marks` con la longitud exacta del texto, o '' si no hay ningún estilo.
 */
export function normalizeMarks(text: string, marks: string | undefined): string {
  if (!marks) return '';
  let out = '';
  let any = false;
  for (let i = 0; i < text.length; i++) {
    const m = markAt(marks, i);
    if (m) any = true;
    out += String(m);
  }
  return any ? out : '';
}

/** Trozos consecutivos con el mismo estilo, listos para pintar como <span>. */
export function segmentText(text: string, marks: string | undefined): TextSegment[] {
  const segments: TextSegment[] = [];
  for (let i = 0; i < text.length; i++) {
    const mark = markAt(marks, i);
    const last = segments[segments.length - 1];
    if (last && last.mark === mark) last.text += text[i];
    else segments.push({ text: text[i], mark });
  }
  return segments;
}

/** ¿Todos los caracteres de [start, end) llevan `bit`? Falso si el rango está vacío. */
export function rangeHasMark(marks: string | undefined, start: number, end: number, bit: number): boolean {
  if (end <= start) return false;
  for (let i = start; i < end; i++) {
    if (!(markAt(marks, i) & bit)) return false;
  }
  return true;
}

/** Pone o quita `bit` en [start, end). */
export function setMarkInRange(
  text: string,
  marks: string | undefined,
  start: number,
  end: number,
  bit: number,
  on: boolean
): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    let m = markAt(marks, i);
    if (i >= start && i < end) m = on ? m | bit : m & ~bit;
    out += String(m);
  }
  return normalizeMarks(text, out);
}

/**
 * Recalcula los estilos tras editar el texto a mano.
 *
 * Solo sabemos el texto de antes y el de después, así que se busca el tramo que
 * cambió (prefijo y sufijo comunes): lo que rodea al cambio conserva su estilo y
 * lo que se insertó toma `insertMark` si viene dado (negrilla/itálica activadas
 * con el cursor sin selección) o, si no, el del carácter anterior —como en
 * cualquier procesador de texto, se sigue escribiendo con el estilo de al lado—.
 */
export function marksAfterEdit(
  oldText: string,
  oldMarks: string | undefined,
  newText: string,
  insertMark?: number
): string {
  let prefix = 0;
  const maxPrefix = Math.min(oldText.length, newText.length);
  while (prefix < maxPrefix && oldText[prefix] === newText[prefix]) prefix++;
  let suffix = 0;
  const maxSuffix = Math.min(oldText.length, newText.length) - prefix;
  while (
    suffix < maxSuffix &&
    oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) suffix++;

  const inserted = newText.length - prefix - suffix;
  const inherit =
    insertMark ??
    (prefix > 0 ? markAt(oldMarks, prefix - 1) : oldText.length > 0 ? markAt(oldMarks, 0) : 0);

  let out = '';
  for (let i = 0; i < prefix; i++) out += String(markAt(oldMarks, i));
  for (let i = 0; i < inserted; i++) out += String(inherit);
  for (let i = oldText.length - suffix; i < oldText.length; i++) out += String(markAt(oldMarks, i));
  return normalizeMarks(newText, out);
}

/** Estilo CSS de un trozo. */
export function markStyle(mark: number): { fontWeight: 'bold' | 'normal'; fontStyle: 'italic' | 'normal' } {
  return {
    fontWeight: mark & MARK_BOLD ? 'bold' : 'normal',
    fontStyle: mark & MARK_ITALIC ? 'italic' : 'normal',
  };
}
