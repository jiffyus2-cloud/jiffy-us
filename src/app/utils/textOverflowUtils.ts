// ============================================================================
// Cuánto texto cabe en una caja de texto de una página
// ============================================================================
// El tamaño de letra se pinta en `cqi` sobre el ANCHO del marco
// (`fontSize * 0.25` cqi), así que lo que cabe no depende de lo grande que sea
// el marco sino de su forma: un marco el doble de ancho que de alto tiene la
// mitad de líneas que uno cuadrado con la misma letra.
//
// Antes la capacidad salía de una tabla fija calibrada para un marco cuadrado.
// Eso dejaba los marcos cuadrados al 20-40 % de su altura (a 12px se cortaba en
// 320 caracteres cuando caben ~1.400) y desbordaba los anchos —la panorámica de
// una sola foto en horizontal llegaba al 170 % con letra grande—. Ahora se
// simula el ajuste de línea con la proporción real del marco y el ancho medio
// de la tipografía elegida.
// ============================================================================

import { markAt, markStyle, segmentText, MARK_BOLD } from './textMarks';

export type TextOverflowMode = 'limit' | 'shrink';

export const FONT_SIZES = [12, 16, 20, 24, 32, 40, 48, 64];

export const MIN_FONT_SIZE = 10;

// Tope absoluto en modo 'shrink' para que un texto patológico no degrade el
// render ni el PDF.
export const MAX_SHRINK_CHARS = 2000;

/** Forma del marco y tipografía de la caja. */
export interface TextBoxShape {
  /** Ancho/alto real del marco (ver `getSlotAspect`). Por defecto, cuadrado. */
  aspect?: number;
  /** El `fontFamily` guardado en la caja. */
  fontFamily?: string;
  /** `textBox.marks` del texto: la negrilla ocupa más. */
  marks?: string;
}

interface FontMetrics {
  /** Ancho medio de un carácter (espacios incluidos), en em, con ~10 % de margen. */
  em: number;
  /** Cuánto más ancha es una mayúscula que el promedio. */
  upper: number;
  /** Cuánto más ancho es un carácter en negrilla. */
  bold: number;
}

/**
 * Medido con texto en español en Chrome (canvas `measureText`) y ajustado con
 * un barrido de 5.120 casos —8 formas de marco × 5 tipografías × 8 tamaños ×
 * minúsculas/mayúsculas/negrilla/saltos de línea— para que el texto más largo
 * que se deja escribir nunca pase del 90 % del alto del marco.
 */
const FONT_METRICS: (FontMetrics & { match: RegExp })[] = [
  { match: /courier|mono/i, em: 0.62, upper: 1, bold: 1 },
  { match: /playfair/i, em: 0.47, upper: 1.42, bold: 1.08 },
  { match: /dancing|cursive/i, em: 0.51, upper: 1.36, bold: 1.08 },
  { match: /georgia|serif/i, em: 0.49, upper: 1.34, bold: 1.18 },
  { match: /arial|sans/i, em: 0.5, upper: 1.32, bold: 1.08 },
];
const DEFAULT_METRICS: FontMetrics = { em: 0.5, upper: 1.4, bold: 1.18 };

function charWidthFor(fontFamily?: string): FontMetrics {
  if (!fontFamily) return DEFAULT_METRICS;
  return FONT_METRICS.find((f) => f.match.test(fontFamily)) ?? DEFAULT_METRICS;
}

/** Igual que el `lineHeight` con que se pinta la caja. */
const LINE_HEIGHT_EM = 1.3;
/** La caja de texto ocupa el 90 % del ancho del marco. */
const BOX_WIDTH_CQI = 90;
/** Margen vertical: se usa como mucho el 90 % del alto del marco. */
const USABLE_HEIGHT = 0.9;

/** Cuántos caracteres caben por línea y cuántas líneas en el marco. */
export function getTextBoxGrid(fontSize: number, shape: TextBoxShape = {}): { charsPerLine: number; maxLines: number } {
  const emCqi = Math.max(1, fontSize) * 0.25;
  const aspect = shape.aspect && shape.aspect > 0 && Number.isFinite(shape.aspect) ? shape.aspect : 1;
  const heightCqi = (100 / aspect) * USABLE_HEIGHT;
  return {
    // Holgura por línea: con letra grande caben ~10 caracteres por línea y una
    // palabra con letras anchas (m, ñ, w) ya no entra donde el promedio dice.
    charsPerLine: Math.max(1, Math.floor((BOX_WIDTH_CQI / (emCqi * charWidthFor(shape.fontFamily).em)) * 0.95) - 1),
    maxLines: Math.max(1, Math.floor(heightCqi / (emCqi * LINE_HEIGHT_EM))),
  };
}

/**
 * Líneas que ocupa `text` con `charsPerLine` caracteres por línea: ajuste por
 * palabras como el navegador (`pre-wrap` + `break-word`); cada salto de línea
 * abre una línea nueva. `widthOf` da el ancho de cada carácter en unidades de
 * "carácter medio": una mayúscula o una negrilla valen más (un "FELIZ
 * CUMPLEAÑOS" en mayúsculas sostenidas desbordaba si se contaba como corrido).
 */
export function countWrappedLines(
  text: string,
  charsPerLine: number,
  widthOf: (ch: string, index: number) => number = () => 1,
): number {
  let total = 0;
  let index = 0;
  for (const para of text.split('\n')) {
    let lines = 1;
    let cur = 0;
    let first = true;
    for (const word of para.split(' ')) {
      let w = 0;
      for (let k = 0; k < word.length; k++) w += widthOf(word[k], index + k);
      // La palabra y el espacio (o el salto de línea) que la sigue.
      index += word.length + 1;
      if (first) {
        cur = w;
        first = false;
      } else if (cur + 1 + w <= charsPerLine) {
        cur += 1 + w;
      } else {
        lines++;
        cur = w;
      }
      // Una palabra más larga que la línea se parte.
      while (cur > charsPerLine) {
        lines++;
        cur -= charsPerLine;
      }
    }
    total += lines;
  }
  return total;
}

// ── Medición real en el navegador ───────────────────────────────────────────
// La estimación de arriba es a propósito pesimista (ancho medio con margen,
// palabras que no entran donde dice el promedio): con ella el cliente veía
// medio cuadro vacío y ya no le dejaba escribir. En el navegador se mide el
// texto de verdad: un bloque oculto con la misma tipografía, el mismo ajuste de
// línea y la misma escala (`fontSize * 0.25` % del ancho del marco) que la
// página. La estimación queda para Node (tests) o si el navegador no maqueta.

/** Ancho del marco de medición. A esta escala 1 cqi = 10 px. */
const MEASURE_FRAME_PX = 1000;
/**
 * Se mide con la caja un 1 % más estrecha que la que se pinta (89 % frente a
 * 90 %): margen para las diferencias de ajuste entre navegadores y entre la
 * miniatura, el visor y el PDF. A simple vista no se nota.
 */
const MEASURE_BOX_WIDTH_CQI = BOX_WIDTH_CQI - 1;

let probe: HTMLDivElement | null = null;
let probeWorks: boolean | null = null;
const measureCache = new Map<string, number>();

function getProbe(): HTMLDivElement | null {
  if (probeWorks === false) return null;
  if (typeof document === 'undefined' || !document.body) return null;
  if (!probe || !probe.isConnected) {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.dataset.textMeasure = '';
    Object.assign(host.style, {
      position: 'fixed',
      left: '-20000px',
      top: '0',
      width: `${MEASURE_FRAME_PX}px`,
      visibility: 'hidden',
      pointerEvents: 'none',
      contain: 'layout style',
    });
    probe = document.createElement('div');
    Object.assign(probe.style, {
      width: `${(MEASURE_FRAME_PX * MEASURE_BOX_WIDTH_CQI) / 100}px`,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      lineHeight: String(LINE_HEIGHT_EM),
      padding: '0',
      margin: '0',
    });
    host.appendChild(probe);
    document.body.appendChild(host);
    // Una tipografía web que termina de cargar cambia lo que cabe.
    document.fonts?.addEventListener?.('loadingdone', () => measureCache.clear());
  }
  if (probeWorks === null) {
    probe.style.fontSize = '20px';
    probe.textContent = 'x';
    // jsdom y similares no maquetan: todo mediría 0.
    probeWorks = probe.offsetHeight > 0;
    if (!probeWorks) return null;
  }
  return probe;
}

/**
 * Alto que ocupa `text` a `fontSize`, como fracción del alto utilizable del
 * marco (1 = lleno). null si no se puede medir.
 */
export function measureTextFill(text: string, fontSize: number, shape: TextBoxShape = {}): number | null {
  const el = getProbe();
  if (!el) return null;
  const aspect = shape.aspect && shape.aspect > 0 && Number.isFinite(shape.aspect) ? shape.aspect : 1;
  const key = `${fontSize}|${aspect}|${shape.fontFamily ?? ''}|${shape.marks ?? ''}|${text}`;
  let height = measureCache.get(key);
  if (height === undefined) {
    el.style.fontFamily = shape.fontFamily || '';
    el.style.fontSize = `${(Math.max(1, fontSize) * 0.25 * MEASURE_FRAME_PX) / 100}px`;
    el.replaceChildren();
    for (const seg of segmentText(text, shape.marks)) {
      const span = document.createElement('span');
      const st = markStyle(seg.mark);
      span.style.fontWeight = st.fontWeight;
      span.style.fontStyle = st.fontStyle;
      span.textContent = seg.text;
      el.appendChild(span);
    }
    height = el.getBoundingClientRect().height;
    if (measureCache.size > 3000) measureCache.clear();
    measureCache.set(key, height);
  }
  const usable = (MEASURE_FRAME_PX / aspect) * USABLE_HEIGHT;
  return height / usable;
}

/** ¿Cabe `text` a `fontSize` en el marco? */
export function textFitsBox(text: string, fontSize: number, shape: TextBoxShape = {}): boolean {
  // Medio píxel de tolerancia sobre ~900 px por redondeos de subpíxel.
  const fill = measureTextFill(text, fontSize, shape);
  if (fill !== null) return fill <= 1.0005;
  const { charsPerLine, maxLines } = getTextBoxGrid(fontSize, shape);
  const { upper, bold } = charWidthFor(shape.fontFamily);
  const marks = shape.marks;
  const widthOf = (ch: string, i: number) =>
    (ch !== ch.toLowerCase() ? upper : 1) * (marks && markAt(marks, i) & MARK_BOLD ? bold : 1);
  return countWrappedLines(text, charsPerLine, widthOf) <= maxLines;
}

/** Caracteres que caben aproximadamente (texto corrido, sin saltos de línea). */
export function getMaxCharsForFontSize(fontSize: number, shape: TextBoxShape = {}): number {
  const { charsPerLine, maxLines } = getTextBoxGrid(fontSize, shape);
  // El ajuste por palabras desperdicia de media ~media palabra por línea.
  return Math.max(1, Math.floor(charsPerLine * maxLines * 0.9));
}

/** El texto más largo (prefijo de `text`) que todavía cabe. */
export function clampTextToBox(text: string, fontSize: number, shape: TextBoxShape = {}): string {
  if (textFitsBox(text, fontSize, shape)) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (textFitsBox(text.slice(0, mid), fontSize, shape)) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo);
}

/** El tamaño hasta el que se puede bajar la letra en 'shrink'. */
function shrinkFloor(fontSize: number): number {
  return Math.min(fontSize, MIN_FONT_SIZE);
}

/** Lo que cabe en el modo dado: en 'shrink', lo que cabe con la letra mínima. */
export function clampTextForMode(text: string, fontSize: number, mode: TextOverflowMode, shape: TextBoxShape = {}): string {
  return mode === 'shrink'
    ? clampTextToBox(text.slice(0, MAX_SHRINK_CHARS), shrinkFloor(fontSize), shape)
    : clampTextToBox(text, fontSize, shape);
}

/**
 * ¿Se puede seguir escribiendo? En 'limit' manda el tamaño elegido; en
 * 'shrink' la letra baja hasta MIN_FONT_SIZE, así que el tope es lo que cabe ahí.
 */
export function textFitsForMode(text: string, fontSize: number, mode: TextOverflowMode, shape: TextBoxShape = {}): boolean {
  if (mode === 'shrink') {
    return text.length <= MAX_SHRINK_CHARS && textFitsBox(text, shrinkFloor(fontSize), shape);
  }
  return textFitsBox(text, fontSize, shape);
}

/**
 * El tamaño con que se pinta de verdad la caja.
 * - 'limit': el texto ya viene recortado a lo que cabe: el tamaño elegido.
 * - 'shrink': se baja de 1 en 1 hasta que quepa, sin pasar de MIN_FONT_SIZE.
 */
export function getEffectiveFontSize(fontSize: number, text: string, mode: TextOverflowMode, shape: TextBoxShape = {}): number {
  if (mode === 'limit') return fontSize;
  const floor = shrinkFloor(fontSize);
  for (let size = fontSize; size > floor; size--) {
    if (textFitsBox(text, size, shape)) return size;
  }
  return floor;
}
