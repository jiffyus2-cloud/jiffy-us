import { describe, it, expect } from 'vitest';
import { getCoverTextLimits, getSampleSubtitle, type CoverSize, type CoverType } from './coverTextLimits';

const SIZES: CoverSize[] = ['20x20', '30x30', '21x28', '28x21'];
const TYPES: CoverType[] = ['Tela', 'Papel'];

/** numLayouts según CoverEditor.tsx:127 / AlbumCustomization.tsx:123 */
const numLayouts = (size: CoverSize, type: CoverType) =>
  type === 'Tela' ? 3 : size === '28x21' ? 4 : 5;

function* allCombos() {
  for (const size of SIZES) {
    for (const type of TYPES) {
      for (let layout = 1; layout <= numLayouts(size, type); layout++) {
        yield { size, type, layout };
      }
    }
  }
}

describe('getCoverTextLimits — matriz de límites', () => {
  // Esta tabla es el contrato. Cambiar AVG_CHAR_EM o un usableWidthPct debe ser
  // un diff deliberado y revisable, no un cambio silencioso de lo que el usuario
  // puede escribir.
  const MATRIX: Record<string, Array<[number | null, number | null]>> = {
    // familia: [ [título L1, subtítulo L1], [L2], [L3], [L4], [L5] ]
    'Tela':             [[32, 46], [40, 32], [16, 26]],
    'Papel/28x21':      [[25, null], [17, 17], [19, 16], [32, 37]],
    'Papel/21x28':      [[39, 61], [22, 22], [22, 18], [48, 48], [null, null]],
    'Papel/20x20':      [[24, 29], [20, 20], [20, 17], [43, 43], [null, null]],
    'Papel/30x30':      [[23, 27], [23, 23], [22, 18], [46, 46], [null, null]],
  };

  it('Tela: idéntica en los 4 tamaños (su geometría es cqw pura)', () => {
    for (let layout = 1; layout <= 3; layout++) {
      const [title, subtitle] = MATRIX['Tela'][layout - 1];
      for (const size of SIZES) {
        const limits = getCoverTextLimits(size, 'Tela', layout);
        expect({ size, layout, ...limits }).toMatchObject({ title, subtitle });
      }
    }
  });

  it.each(['28x21', '21x28', '20x20', '30x30'] as CoverSize[])(
    'Papel %s: título y subtítulo por layout',
    (size) => {
      const expected = MATRIX[`Papel/${size}`];
      expect(expected).toHaveLength(numLayouts(size, 'Papel'));
      expected.forEach(([title, subtitle], i) => {
        const limits = getCoverTextLimits(size, 'Papel', i + 1);
        expect({ layout: i + 1, ...limits }).toMatchObject({ title, subtitle });
      });
    },
  );

  it('todas las combinaciones devuelven enteros positivos o null', () => {
    for (const { size, type, layout } of allCombos()) {
      const { title, subtitle, spine } = getCoverTextLimits(size, type, layout);
      for (const v of [title, subtitle]) {
        if (v !== null) expect(Number.isInteger(v) && v > 0).toBe(true);
      }
      expect(Number.isInteger(spine) && spine > 0).toBe(true);
    }
  });
});

describe('getCoverTextLimits — contrato de null', () => {
  // Espeja CoverPreview.tsx: cuadrado L5 y horizontal-Papel L5 no llevan texto;
  // vertical L1 no lleva subtítulo. Se re-derivan aquí exactamente como en
  // CoverEditor.tsx:80-88 — es el invariante que mantiene la tabla sincronizada.
  it('title === null ⟺ layout full-bleed sin texto', () => {
    for (const { size, type, layout } of allCombos()) {
      const isSquare = size === '20x20' || size === '30x30';
      const isSquareLayout5 = isSquare && type === 'Papel' && layout === 5;
      const isLayout5 = size === '21x28' && layout === 5 && type === 'Papel';
      const expectNull = isSquareLayout5 || isLayout5;

      expect({ size, type, layout, isNull: getCoverTextLimits(size, type, layout).title === null })
        .toMatchObject({ isNull: expectNull });
    }
  });

  it('subtitle === null ⟺ !subtitleFieldVisible de CoverEditor', () => {
    for (const { size, type, layout } of allCombos()) {
      const isSquare = size === '20x20' || size === '30x30';
      const isVertical = size === '28x21';
      const isSquareLayout5 = isSquare && type === 'Papel' && layout === 5;
      const isLayout5 = size === '21x28' && layout === 5 && type === 'Papel';
      const subtitleFieldVisible =
        !isSquareLayout5 && !isLayout5 && !(isVertical && type === 'Papel' && layout === 1);

      expect({ size, type, layout, visible: getCoverTextLimits(size, type, layout).subtitle !== null })
        .toMatchObject({ visible: subtitleFieldVisible });
    }
  });
});

describe('getCoverTextLimits — lomo', () => {
  const spine = (s: CoverSize) => getCoverTextLimits(s, 'Papel', 1).spine;

  it('crece monótonamente con el alto del álbum', () => {
    // 20cm < 21cm (horizontal) < 28cm (vertical) < 30cm
    expect(spine('20x20')).toBeLessThan(spine('21x28'));
    expect(spine('21x28')).toBeLessThan(spine('28x21'));
    expect(spine('28x21')).toBeLessThan(spine('30x30'));
  });

  it('toma la rama del PDF, que es la restrictiva', () => {
    // Si cambia la geometría del lomo en OwnerDashboard.tsx:822-837, este test
    // es el disparador: estos números salen del renderer del PDF, no del preview.
    expect(spine('20x20')).toBe(44);
    expect(spine('21x28')).toBe(46);
    expect(spine('28x21')).toBe(62);
    expect(spine('30x30')).toBe(66);
  });

  it('no depende del layout', () => {
    for (const { size, type, layout } of allCombos()) {
      expect(getCoverTextLimits(size, type, layout).spine).toBe(spine(size));
    }
  });
});

describe('getCoverTextLimits — usabilidad y robustez', () => {
  it('ningún límite deja el campo inservible', () => {
    for (const { size, type, layout } of allCombos()) {
      const { title, subtitle, spine } = getCoverTextLimits(size, type, layout);
      for (const v of [title, subtitle]) {
        if (v !== null) expect({ size, type, layout, v }).toMatchObject({ v: expect.any(Number) });
        if (v !== null) expect(v).toBeGreaterThanOrEqual(15);
      }
      expect(spine).toBeGreaterThanOrEqual(15);
    }
  });

  it("el default de la app ('NUESTRA HISTORIA') cabe en todo layout con texto", () => {
    const DEFAULT_TITLE = 'NUESTRA HISTORIA'; // CoverEditor.tsx:91
    for (const { size, type, layout } of allCombos()) {
      const { title } = getCoverTextLimits(size, type, layout);
      if (title !== null) {
        expect({ size, type, layout, title }).toMatchObject({ title: expect.any(Number) });
        expect(title).toBeGreaterThanOrEqual(DEFAULT_TITLE.length);
      }
    }
  });

  it('un layout fuera de rango cae al 1 sin lanzar', () => {
    const base = getCoverTextLimits('20x20', 'Papel', 1);
    expect(getCoverTextLimits('20x20', 'Papel', 0)).toEqual(base);
    expect(getCoverTextLimits('20x20', 'Papel', 99)).toEqual(base);
  });

  it('a mayor fuente en el mismo ancho útil, menor límite', () => {
    // Cuadrado L2 y L4 comparten familia; L2 tiene la mitad del ancho útil y
    // fuente similar, así que su límite debe ser claramente menor.
    const l2 = getCoverTextLimits('20x20', 'Papel', 2).title!;
    const l4 = getCoverTextLimits('20x20', 'Papel', 4).title!;
    expect(l2).toBeLessThan(l4);
  });
});

describe('getSampleSubtitle — el placeholder del preview nunca desborda', () => {
  it('cabe en el límite de todo layout con subtítulo', () => {
    for (const { size, type, layout } of allCombos()) {
      const { subtitle } = getCoverTextLimits(size, type, layout);
      const sample = getSampleSubtitle(subtitle);
      if (subtitle === null) {
        expect({ size, type, layout, sample }).toMatchObject({ sample: '' });
      } else {
        expect({ size, type, layout, len: sample.length, subtitle })
          .toMatchObject({ len: expect.any(Number) });
        expect(sample.length).toBeGreaterThan(0);
        expect(sample.length).toBeLessThanOrEqual(subtitle);
      }
    }
  });

  it('elige el más largo que entra, no siempre el más corto', () => {
    // Tela L1 admite 46 → debe salir la frase completa; vertical L3 admite 16.
    expect(getSampleSubtitle(getCoverTextLimits('20x20', 'Tela', 1).subtitle))
      .toBe('Nuestros mejores momentos juntos');
    const tight = getCoverTextLimits('28x21', 'Papel', 3).subtitle!;
    expect(getSampleSubtitle(tight).length).toBeLessThanOrEqual(tight);
    expect(getSampleSubtitle(tight).length).toBeGreaterThanOrEqual(tight - 4);
  });
});
