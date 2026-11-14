import { describe, it, expect } from 'vitest';
import {
  clampTextToBox,
  countWrappedLines,
  getEffectiveFontSize,
  getMaxCharsForFontSize,
  getTextBoxGrid,
  MAX_SHRINK_CHARS,
  MIN_FONT_SIZE,
  textFitsBox,
  textFitsForMode,
} from './textOverflowUtils';
import { getSlotAspect } from './pageLayouts';

const LOREM = 'Querida familia gracias por todos estos momentos inolvidables que vivimos juntos este año ';
const longText = (n: number) => LOREM.repeat(Math.ceil(n / LOREM.length)).slice(0, n);

describe('countWrappedLines', () => {
  it('ajusta por palabras y cuenta cada salto de línea', () => {
    expect(countWrappedLines('', 10)).toBe(1);
    expect(countWrappedLines('hola mundo', 10)).toBe(1);
    expect(countWrappedLines('hola mundo bonito', 10)).toBe(2);
    expect(countWrappedLines('a\nb\nc', 10)).toBe(3);
    expect(countWrappedLines('\n\n\n', 10)).toBe(4);
  });

  it('parte una palabra más larga que la línea', () => {
    expect(countWrappedLines('x'.repeat(25), 10)).toBe(3);
  });
});

describe('capacidad según la forma del marco', () => {
  it('un marco cuadrado admite bastante más que la tabla vieja a letra pequeña', () => {
    // La tabla fija cortaba en 320 caracteres a 12px; caben ~1.400.
    expect(getMaxCharsForFontSize(12, { aspect: 1 })).toBeGreaterThan(800);
    expect(textFitsBox(longText(700), 12, { aspect: 1 })).toBe(true);
  });

  it('un marco ancho admite menos líneas que uno cuadrado', () => {
    const square = getTextBoxGrid(64, { aspect: 1 });
    const panorama = getTextBoxGrid(64, { aspect: 2.03 });
    expect(panorama.charsPerLine).toBe(square.charsPerLine);
    expect(panorama.maxLines).toBeLessThan(square.maxLines);
    // La panorámica horizontal a 64px se desbordaba con los 30 caracteres de antes.
    expect(textFitsBox(longText(30), 64, { aspect: 2.03 })).toBe(false);
  });

  it('los saltos de línea consumen líneas aunque haya pocos caracteres', () => {
    const { maxLines } = getTextBoxGrid(24, { aspect: 1 });
    expect(textFitsBox('a\n'.repeat(maxLines - 1) + 'a', 24, { aspect: 1 })).toBe(true);
    expect(textFitsBox('a\n'.repeat(maxLines) + 'a', 24, { aspect: 1 })).toBe(false);
  });

  it('getSlotAspect usa la proporción real de la página', () => {
    expect(getSlotAspect({ x: 0, y: 0, w: 100, h: 100 }, 'Cuadrado 20x20 cm')).toBe(1);
    expect(getSlotAspect({ x: 0, y: 0, w: 100, h: 100 }, 'Horizontal 28x21 cm')).toBeCloseTo(4 / 3);
    expect(getSlotAspect({ x: 0, y: 17.23, w: 100, h: 65.54 }, 'Horizontal 28x21 cm')).toBeCloseTo(2.03, 2);
  });
});

describe('clampTextToBox', () => {
  it('deja el texto intacto si cabe y recorta al prefijo más largo si no', () => {
    expect(clampTextToBox('hola', 24, { aspect: 1 })).toBe('hola');
    const clamped = clampTextToBox(longText(3000), 24, { aspect: 1 });
    expect(textFitsBox(clamped, 24, { aspect: 1 })).toBe(true);
    expect(textFitsBox(longText(3000).slice(0, clamped.length + 1), 24, { aspect: 1 })).toBe(false);
  });
});

describe('modo reducir tamaño', () => {
  it('baja la letra hasta que cabe', () => {
    const text = longText(400);
    expect(textFitsBox(text, 48, { aspect: 1 })).toBe(false);
    const size = getEffectiveFontSize(48, text, 'shrink', { aspect: 1 });
    expect(size).toBeLessThan(48);
    expect(size).toBeGreaterThanOrEqual(MIN_FONT_SIZE);
    expect(textFitsBox(text, size, { aspect: 1 })).toBe(true);
  });

  it('no deja escribir más de lo que cabe a la letra mínima', () => {
    const atMin = clampTextToBox(longText(MAX_SHRINK_CHARS), MIN_FONT_SIZE, { aspect: 2.03 });
    expect(textFitsForMode(atMin, 24, 'shrink', { aspect: 2.03 })).toBe(true);
    expect(textFitsForMode(atMin + 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 24, 'shrink', { aspect: 2.03 })).toBe(false);
  });

  it('en modo limitar el tamaño no cambia', () => {
    expect(getEffectiveFontSize(32, longText(1000), 'limit', { aspect: 1 })).toBe(32);
  });
});

describe('estilo y tipografía', () => {
  it('la negrilla ocupa más que el texto normal', () => {
    const text = longText(5000);
    const normal = clampTextToBox(text, 24, { aspect: 1, fontFamily: 'Georgia' });
    const bold = clampTextToBox(text, 24, { aspect: 1, fontFamily: 'Georgia', marks: '1'.repeat(text.length) });
    expect(bold.length).toBeLessThan(normal.length);
  });

  it('las mayúsculas sostenidas ocupan más que las minúsculas', () => {
    const text = longText(5000);
    const lower = clampTextToBox(text, 24, { aspect: 1, fontFamily: 'Arial' });
    const upper = clampTextToBox(text.toUpperCase(), 24, { aspect: 1, fontFamily: 'Arial' });
    expect(upper.length).toBeLessThan(lower.length);
  });

  it('Courier (monoespaciada) admite menos que Arial', () => {
    expect(getMaxCharsForFontSize(24, { fontFamily: 'Courier New' }))
      .toBeLessThan(getMaxCharsForFontSize(24, { fontFamily: 'Arial' }));
  });
});
