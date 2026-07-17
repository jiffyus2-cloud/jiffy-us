export type TextOverflowMode = 'limit' | 'shrink';

export const FONT_SIZES = [12, 16, 20, 24, 32, 40, 48, 64];

export const MIN_FONT_SIZE = 10;

// Absolute safety cap so pathologically long text in 'shrink' mode can't
// degrade render/PDF-export performance even after the font floors out.
export const MAX_SHRINK_CHARS = 2000;

// Heuristic capacity table calibrated for a text box filling ~90% of a
// roughly square page cell with word-wrap across multiple lines.
const MAX_CHARS_BY_FONT_SIZE: Record<number, number> = {
  12: 320,
  16: 220,
  20: 160,
  24: 120,
  32: 80,
  40: 60,
  48: 45,
  64: 30,
};

const TABLE_SIZES = Object.keys(MAX_CHARS_BY_FONT_SIZE).map(Number).sort((a, b) => a - b);
const MIN_TABLE_SIZE = TABLE_SIZES[0];
const MAX_TABLE_SIZE = TABLE_SIZES[TABLE_SIZES.length - 1];

/** Max characters that comfortably fit a text box at the given font size. */
export function getMaxCharsForFontSize(fontSize: number): number {
  const exact = MAX_CHARS_BY_FONT_SIZE[fontSize];
  if (exact !== undefined) return exact;

  if (fontSize <= MIN_TABLE_SIZE) {
    const base = MAX_CHARS_BY_FONT_SIZE[MIN_TABLE_SIZE];
    return Math.round(base * (MIN_TABLE_SIZE / fontSize) ** 2);
  }
  if (fontSize >= MAX_TABLE_SIZE) {
    const base = MAX_CHARS_BY_FONT_SIZE[MAX_TABLE_SIZE];
    return Math.max(1, Math.round(base * (MAX_TABLE_SIZE / fontSize) ** 2));
  }

  const upperIdx = TABLE_SIZES.findIndex((s) => s > fontSize);
  const lowerSize = TABLE_SIZES[upperIdx - 1];
  const upperSize = TABLE_SIZES[upperIdx];
  const lowerChars = MAX_CHARS_BY_FONT_SIZE[lowerSize];
  const upperChars = MAX_CHARS_BY_FONT_SIZE[upperSize];
  const ratio = (fontSize - lowerSize) / (upperSize - lowerSize);
  return Math.round(lowerChars + (upperChars - lowerChars) * ratio);
}

/**
 * The font size actually used to render a text box, given its stored
 * fontSize, current text length and overflow-handling mode.
 * - 'limit': text is already capped by maxLength, so it always fits — return fontSize unchanged.
 * - 'shrink': step the font size down until the text fits, floored at MIN_FONT_SIZE.
 */
export function getEffectiveFontSize(fontSize: number, textLength: number, mode: TextOverflowMode): number {
  if (mode === 'limit') return fontSize;
  if (textLength <= getMaxCharsForFontSize(fontSize)) return fontSize;

  for (let size = fontSize - 1; size >= MIN_FONT_SIZE; size--) {
    if (getMaxCharsForFontSize(size) >= textLength) return size;
  }
  return MIN_FONT_SIZE;
}
