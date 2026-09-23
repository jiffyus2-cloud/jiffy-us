import { describe, it, expect } from 'vitest';
import {
  MARK_BOLD,
  MARK_ITALIC,
  markAt,
  normalizeMarks,
  segmentText,
  rangeHasMark,
  setMarkInRange,
  marksAfterEdit,
} from './textMarks';

describe('normalizeMarks', () => {
  it('sin estilos devuelve cadena vacía', () => {
    expect(normalizeMarks('hola', '0000')).toBe('');
    expect(normalizeMarks('hola', undefined)).toBe('');
  });

  it('rellena con normal y recorta a la longitud del texto', () => {
    expect(normalizeMarks('hola', '1')).toBe('1000');
    expect(normalizeMarks('ho', '1111')).toBe('11');
  });
});

describe('segmentText', () => {
  it('agrupa caracteres consecutivos con el mismo estilo', () => {
    expect(segmentText('hola mundo', '1111002222')).toEqual([
      { text: 'hola', mark: 1 },
      { text: ' m', mark: 0 },
      { text: 'undo', mark: 2 },
    ]);
  });

  it('un borrador sin marks es un solo trozo normal', () => {
    expect(segmentText('hola', undefined)).toEqual([{ text: 'hola', mark: 0 }]);
    expect(segmentText('', undefined)).toEqual([]);
  });
});

describe('setMarkInRange / rangeHasMark', () => {
  it('pone negrilla solo en la palabra seleccionada', () => {
    const marks = setMarkInRange('hola mundo', '', 5, 10, MARK_BOLD, true);
    expect(marks).toBe('0000011111');
    expect(rangeHasMark(marks, 5, 10, MARK_BOLD)).toBe(true);
    expect(rangeHasMark(marks, 4, 10, MARK_BOLD)).toBe(false);
  });

  it('negrilla e itálica se combinan y se quitan por separado', () => {
    let marks = setMarkInRange('abc', '', 0, 3, MARK_BOLD, true);
    marks = setMarkInRange('abc', marks, 1, 2, MARK_ITALIC, true);
    expect(marks).toBe('131');
    marks = setMarkInRange('abc', marks, 0, 3, MARK_BOLD, false);
    expect(marks).toBe('020');
  });

  it('un rango vacío no cuenta como marcado', () => {
    expect(rangeHasMark('111', 1, 1, MARK_BOLD)).toBe(false);
  });
});

describe('marksAfterEdit', () => {
  it('lo escrito hereda el estilo del carácter anterior', () => {
    // "hola" en negrilla, se añade "s" al final
    expect(marksAfterEdit('hola', '1111', 'holas')).toBe('11111');
    // se escribe tras un espacio normal
    expect(marksAfterEdit('ab ', '110', 'ab c')).toBe('1100');
  });

  it('insertMark manda sobre la herencia', () => {
    expect(marksAfterEdit('ab', '', 'abc', MARK_ITALIC)).toBe('002');
  });

  it('borrar en medio conserva el estilo de lo que queda', () => {
    expect(marksAfterEdit('abcde', '11022', 'abde')).toBe('1122');
  });

  it('reemplazar una selección conserva prefijo y sufijo', () => {
    // "hola MUNDO fin": se reemplaza "MUNDO" (itálica) por "x"
    const old = 'hola MUNDO fin';
    const marks = '10000222220001';
    expect(marksAfterEdit(old, marks, 'hola x fin')).toBe('1000000001');
  });

  it('al escribir al principio hereda del primer carácter', () => {
    expect(markAt(marksAfterEdit('bc', '11', 'abc'), 0)).toBe(1);
  });
});
