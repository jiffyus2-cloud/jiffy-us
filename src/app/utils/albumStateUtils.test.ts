import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  type AlbumState,
  type AlbumConfig,
  type PageState,
  getNextAllowed,
  freeCapacityFrom,
  fromPropsToAlbumState,
  fromAlbumStateToProps,
  swapPhotosOnPage,
  insertBlankPages,
  movePhotoToPage,
  swapPages,
  movePageToIndex,
  deleteOverflow,
  moveOverflowToPage,
  rippleShift,
  pullShift,
  deletePages,
  analyzeConfigChange,
  migrateAlbumToConfig,
  compactPage,
  occupiedSlotCount,
} from './albumStateUtils';

// ── Configuraciones reales de la app ─────────────────────────────────────────
const SQUARE: AlbumConfig = { allowedPhotosPerPage: [1, 2, 3, 4, 9], maxPages: 250 };
const RECT: AlbumConfig = { allowedPhotosPerPage: [1, 2, 3, 4, 6], maxPages: 250 };

// ── Helpers ──────────────────────────────────────────────────────────────────

function page(photos: string[], extra: Partial<PageState> = {}): PageState {
  return {
    photos: [...photos],
    crops: {},
    texts: {},
    signatures: photos.map(p => (p ? `sig:${p}` : '')),
    ...extra,
  };
}

/** Multiset de fotos reales del álbum. La invariante R1: nunca se pierde ninguna. */
const bag = (s: AlbumState) =>
  s.flatMap(p => p.photos).filter(p => p && p.trim() !== '').sort();

/** ¿Alguna página tiene más fotos de las que su variante deja ver? */
const hidesPhotos = (s: AlbumState, config: AlbumConfig) =>
  s.some(p => {
    const real = p.photos.filter(ph => ph && ph.trim() !== '').length;
    const variant = p.variant ?? getNextAllowed(p.photos.length, config.allowedPhotosPerPage);
    return real > variant;
  });

const albumOf = (...pages: string[][]) => pages.map(p => page(p));

// Un álbum "lleno hasta el tope": tantas páginas como maxPages, todas al máximo.
function fullAlbum(config: AlbumConfig): AlbumState {
  const max = config.allowedPhotosPerPage[config.allowedPhotosPerPage.length - 1];
  return Array.from({ length: config.maxPages }, (_, i) =>
    page(Array.from({ length: max }, (_, j) => `p${i}_${j}`), { variant: max })
  );
}

// ── Guardia: las funciones puras no pueden invocar alert() ────────────────────
const originalAlert = (globalThis as any).alert;
beforeEach(() => {
  (globalThis as any).alert = () => {
    throw new Error('alert() fue invocado desde una función pura de albumStateUtils');
  };
});
afterEach(() => {
  (globalThis as any).alert = originalAlert;
});

// ─────────────────────────────────────────────────────────────────────────────

describe('getNextAllowed', () => {
  it('devuelve el siguiente valor permitido', () => {
    expect(getNextAllowed(1, SQUARE.allowedPhotosPerPage)).toBe(1);
    expect(getNextAllowed(5, SQUARE.allowedPhotosPerPage)).toBe(9);
    expect(getNextAllowed(5, RECT.allowedPhotosPerPage)).toBe(6);
  });

  it('satura en el máximo cuando el conteo lo excede', () => {
    expect(getNextAllowed(20, RECT.allowedPhotosPerPage)).toBe(6);
  });
});

describe('freeCapacityFrom', () => {
  it('cuenta huecos existentes y páginas todavía añadibles (siempre en pares)', () => {
    const state = albumOf(['a'], ['b', 'c']);
    const config: AlbumConfig = { allowedPhotosPerPage: [1, 2, 3, 4, 6], maxPages: 4 };
    // huecos actuales: (6-1) + (6-2) = 9
    // añadibles: 4-2 = 2 páginas (1 par) × 6 = 12
    expect(freeCapacityFrom(state, 0, config)).toBe(9 + 12);
  });

  it('descarta la página impar sobrante (los álbumes crecen de dos en dos)', () => {
    const state = albumOf(['a', 'b', 'c', 'd', 'e', 'f']);
    const config: AlbumConfig = { allowedPhotosPerPage: [1, 2, 3, 4, 6], maxPages: 4 };
    // 3 páginas añadibles → solo 2 utilizables → 12
    expect(freeCapacityFrom(state, 0, config)).toBe(12);
  });

  it('es cero en un álbum lleno y en el máximo de páginas', () => {
    const config: AlbumConfig = { allowedPhotosPerPage: [1, 2, 3, 4, 6], maxPages: 2 };
    const state = albumOf(['a', 'b', 'c', 'd', 'e', 'f'], ['g', 'h', 'i', 'j', 'k', 'l']);
    expect(freeCapacityFrom(state, 0, config)).toBe(0);
  });
});

describe('conversión props ↔ AlbumState', () => {
  it('es de ida y vuelta con índices de página y de foto multidígito', () => {
    const photos = Array.from({ length: 12 }, (_, i) =>
      Array.from({ length: i === 11 ? 9 : 1 }, (_, j) => `p${i}_${j}`)
    );
    const photoCrops = { '11-8': { x: 1, y: 2, zoom: 3 }, '10-0': { x: 4, y: 5, zoom: 6 } };
    const state = fromPropsToAlbumState(photos, photoCrops, {}, {}, {}, []);

    // El parseo debe distinguir la página 11 de la 1, y la foto 8 dentro de ella.
    expect(state[11].crops[8]).toEqual({ x: 1, y: 2, zoom: 3 });
    expect(state[10].crops[0]).toEqual({ x: 4, y: 5, zoom: 6 });

    const back = fromAlbumStateToProps(state);
    expect(back.photos).toEqual(photos);
    expect(back.photoCrops['11-8']).toEqual({ x: 1, y: 2, zoom: 3 });
  });
});

describe('R1 — ninguna operación puede perder fotos', () => {
  const base = () =>
    albumOf(
      ['a1', 'a2', 'a3'],
      ['b1', 'b2'],
      ['c1'],
      [],
    );

  it('swapPhotosOnPage', () => {
    const before = base();
    const after = swapPhotosOnPage(before, 0, 0, 2);
    expect(bag(after)).toEqual(bag(before));
    expect(after[0].photos[0]).toBe('a3');
    expect(after[0].photos[2]).toBe('a1');
  });

  it('swapPhotosOnPage mantiene alineadas fotos y firmas', () => {
    const after = swapPhotosOnPage(base(), 0, 0, 2);
    after[0].photos.forEach((photo, i) => {
      if (photo) expect(after[0].signatures[i]).toBe(`sig:${photo}`);
    });
  });

  it('insertBlankPages', () => {
    const before = base();
    const after = insertBlankPages(before, 0, 2);
    expect(bag(after)).toEqual(bag(before));
    expect(after.length).toBe(before.length + 2);
    expect(after[1].photos).toEqual([]);
  });

  it('movePhotoToPage', () => {
    const before = base();
    const { state: after, success } = movePhotoToPage(before, 0, 0, 2, SQUARE);
    expect(success).toBe(true);
    expect(bag(after)).toEqual(bag(before));
    expect(after[2].photos).toContain('a1');
    expect(hidesPhotos(after, SQUARE)).toBe(false);
  });

  it('movePhotoToPage rechaza sin tocar el origen si el destino está lleno', () => {
    const before = albumOf(['a1'], Array.from({ length: 6 }, (_, i) => `b${i}`));
    const { state: after, success } = movePhotoToPage(before, 0, 0, 1, RECT);
    expect(success).toBe(false);
    expect(after).toBe(before);
    expect(bag(after)).toEqual(bag(before));
  });

  it('swapPages y movePageToIndex', () => {
    const before = base();
    expect(bag(swapPages(before, 0, 2))).toEqual(bag(before));
    expect(bag(movePageToIndex(before, 0, 3))).toEqual(bag(before));
  });

  it('rippleShift', () => {
    const before = albumOf(Array.from({ length: 9 }, (_, i) => `a${i}`), ['b1'], []);
    const result = rippleShift(before, 0, 4, SQUARE);
    expect(result.warnings).toEqual([]);
    expect(bag(result.state)).toEqual(bag(before));
    expect(result.state[0].photos.length).toBe(4);
    expect(hidesPhotos(result.state, SQUARE)).toBe(false);
  });

  it('pullShift', () => {
    const before = albumOf(['a1'], ['b1', 'b2'], ['c1', 'c2']);
    const after = pullShift(before, 0, 4, SQUARE);
    expect(bag(after)).toEqual(bag(before));
    expect(after[0].photos.length).toBeLessThanOrEqual(4);
  });

  it('pullShift propaga el hueco en cascada sin alterar el orden global (P1)', () => {
    const before = albumOf(['a1'], ['b1', 'b2'], ['c1', 'c2']);
    const after = pullShift(before, 0, 4, SQUARE);

    // La página 0 absorbe todo lo que la 1 podía dar; a su vez la 1 se rellena
    // desde la 2. El orden de las fotos en el álbum se mantiene.
    expect(after[0].photos).toEqual(['a1', 'b1', 'b2']);
    expect(after[1].photos).toEqual(['c1']);
    expect(after[2].photos).toEqual(['c2']);
    expect(bag(after)).toEqual(bag(before));
  });

  it('moveOverflowToPage', () => {
    const before = albumOf(Array.from({ length: 9 }, (_, i) => `a${i}`), [], []);
    const result = moveOverflowToPage(before, 0, 4, 2, SQUARE);
    expect(bag(result.state)).toEqual(bag(before));
    expect(result.state[2].photos.length).toBe(5);
    expect(hidesPhotos(result.state, SQUARE)).toBe(false);
  });
});

describe('R2 — la variante nunca oculta fotos', () => {
  it('rippleShift sube la variante de la página destino si hace falta', () => {
    const before = albumOf(Array.from({ length: 9 }, (_, i) => `a${i}`), ['b1'], []);
    const { state } = rippleShift(before, 0, 1, SQUARE);
    state.forEach(p => {
      const real = p.photos.filter(Boolean).length;
      if (real > 0) expect(p.variant).toBeGreaterThanOrEqual(real);
    });
  });

  it('moveOverflowToPage no baja una variante ya mayor', () => {
    const before = albumOf(
      Array.from({ length: 9 }, (_, i) => `a${i}`),
      [],
      page([], { variant: 9 }).photos.length === 0 ? [] : [],
    );
    before[2].variant = 9;
    const { state } = moveOverflowToPage(before, 0, 4, 2, SQUARE);
    expect(state[2].variant).toBe(9);
  });
});

describe('R3 — el layout de la página nunca se toca', () => {
  it('se conserva a través de rippleShift, pullShift y moveOverflowToPage', () => {
    const before = albumOf(Array.from({ length: 9 }, (_, i) => `a${i}`), ['b1'], []);
    before[0].layout = 'row';
    before[1].layout = 'column';

    const ripple = rippleShift(before, 0, 4, SQUARE).state;
    expect(ripple[0].layout).toBe('row');
    expect(ripple[1].layout).toBe('column');

    const pulled = pullShift(before, 0, 9, SQUARE);
    expect(pulled[0].layout).toBe('row');
    expect(pulled[1].layout).toBe('column');

    const moved = moveOverflowToPage(before, 0, 4, 2, SQUARE).state;
    expect(moved[0].layout).toBe('row');
  });
});

// ── B6: el límite de páginas ya no puede tragarse fotos ───────────────────────

describe('B6 — límite de páginas: todo o nada', () => {
  it('rippleShift es un no-op exacto si el excedente no cabe', () => {
    const config: AlbumConfig = { allowedPhotosPerPage: [1, 2, 3, 4, 6], maxPages: 2 };
    const before = albumOf(
      ['a0', 'a1', 'a2', 'a3', 'a4', 'a5'],
      ['b0', 'b1', 'b2', 'b3', 'b4', 'b5'],
    );

    const result = rippleShift(before, 0, 1, config);

    // Identidad: se devuelve exactamente el estado de entrada, no una copia mutada.
    expect(result.state).toBe(before);
    expect(bag(result.state)).toEqual(bag(before));
    expect(result.warnings).toEqual([{ code: 'max_pages_reached', unplacedPhotos: 5 }]);
  });

  it('moveOverflowToPage es un no-op si el destino exigiría pasarse de maxPages', () => {
    const config: AlbumConfig = { allowedPhotosPerPage: [1, 2, 3, 4, 6], maxPages: 2 };
    const before = albumOf(['a0', 'a1', 'a2', 'a3'], ['b0']);

    // targetPage 5 obligaría a crecer más allá de maxPages.
    const result = moveOverflowToPage(before, 0, 2, 5, config);

    expect(result.state).toBe(before);
    expect(bag(result.state)).toEqual(bag(before));
    expect(result.warnings[0].code).toBe('max_pages_reached');
  });

  it('la cascada que necesita justo la última página libre sí funciona', () => {
    const config: AlbumConfig = { allowedPhotosPerPage: [1, 2, 3, 4, 6], maxPages: 4 };
    const before = albumOf(['a0', 'a1', 'a2', 'a3', 'a4', 'a5'], []);

    const result = rippleShift(before, 0, 1, config);

    expect(result.warnings).toEqual([]);
    expect(bag(result.state)).toEqual(bag(before));
    expect(result.state[0].photos.length).toBe(1);
  });

  it('no invoca alert() ni siquiera al topar con el límite', () => {
    // El beforeEach convierte cualquier alert() en excepción.
    const config: AlbumConfig = { allowedPhotosPerPage: [1, 2, 3, 4, 6], maxPages: 2 };
    expect(() => rippleShift(fullAlbum(config), 0, 1, config)).not.toThrow();
    expect(() => moveOverflowToPage(fullAlbum(config), 0, 1, 9, config)).not.toThrow();
  });
});

// ── B10 / B13: borrado de páginas ────────────────────────────────────────────

describe('deletePages', () => {
  it('se niega a borrar páginas con contenido salvo permiso explícito', () => {
    const before = albumOf(['a1'], [], ['c1']);
    const result = deletePages(before, [0]);

    expect(result.state).toBe(before);
    expect(result.warnings).toEqual([{ code: 'refused_photo_deletion', pages: [0] }]);
  });

  it('se niega también si la página solo tiene texto', () => {
    const before = albumOf([], []);
    before[0].texts = { 0: { text: 'hola' } };
    expect(deletePages(before, [0]).warnings[0].code).toBe('refused_photo_deletion');
  });

  it('borra páginas vacías sin necesidad de permiso', () => {
    const before = albumOf(['a1'], [], ['c1'], []);
    const result = deletePages(before, [1, 3]);

    expect(result.warnings).toEqual([]);
    expect(result.state.length).toBe(2);
    expect(bag(result.state)).toEqual(['a1', 'c1']);
  });

  it('borra con contenido cuando se autoriza, y avisa de cuántas fotos', () => {
    const before = albumOf(['a1', 'a2'], []);
    const result = deletePages(before, [0], { allowPhotoDeletion: true });

    expect(result.state.length).toBe(1);
    expect(result.warnings).toEqual([{ code: 'photos_deleted', count: 2 }]);
  });

  it('reindexa crops y textos con índices de dos cifras', () => {
    // 12 páginas; borramos la 1 → la antigua 11 pasa a ser la 10.
    const before: AlbumState = Array.from({ length: 12 }, (_, i) => page(i === 0 ? ['keep'] : []));
    before[11].photos = ['x'];
    before[11].crops = { 0: { x: 9, y: 9, zoom: 2 } };
    before[11].texts = { 0: { text: 'final' } };

    const result = deletePages(before, [1]);
    expect(result.state.length).toBe(11);

    const props = fromAlbumStateToProps(result.state);
    // Con el antiguo split('-') este caso se corrompía.
    expect(props.photoCrops['10-0']).toEqual({ x: 9, y: 9, zoom: 2 });
    expect(props.textBoxSlots[10]).toEqual({ 0: { text: 'final' } });
  });

  it('ignora índices fuera de rango y duplicados', () => {
    const before = albumOf([], [], []);
    const result = deletePages(before, [1, 1, 99, -3]);
    expect(result.state.length).toBe(2);
  });
});

// ── B5: cambio de tamaño del álbum ───────────────────────────────────────────

describe('analyzeConfigChange / migrateAlbumToConfig', () => {
  const nineUp = () =>
    albumOf(
      Array.from({ length: 9 }, (_, i) => `a${i}`),
      Array.from({ length: 9 }, (_, i) => `b${i}`),
      [],
      [],
    );

  it('detecta las fotos que quedarían ocultas al pasar de Cuadrado a Horizontal', () => {
    const impact = analyzeConfigChange(nineUp(), RECT);
    expect(impact.pagesAffected).toEqual([0, 1]);
    expect(impact.photosAtRisk).toBe(6); // 3 por página
  });

  it('no señala nada cuando el formato crece', () => {
    const state = albumOf(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(analyzeConfigChange(state, SQUARE).photosAtRisk).toBe(0);
  });

  it('migra sin perder ni ocultar fotos', () => {
    const before = nineUp();
    const result = migrateAlbumToConfig(before, RECT);

    expect(result.warnings).toEqual([]);
    expect(bag(result.state)).toEqual(bag(before));
    result.state.forEach(p => {
      expect(p.photos.filter(Boolean).length).toBeLessThanOrEqual(6);
    });
    expect(hidesPhotos(result.state, RECT)).toBe(false);
  });

  it('conserva el layout de cada página al migrar', () => {
    const before = nineUp();
    before[0].layout = 'row';
    const result = migrateAlbumToConfig(before, RECT);
    expect(result.state[0].layout).toBe('row');
  });

  it('no aplica nada si la migración no cabe', () => {
    const config: AlbumConfig = { allowedPhotosPerPage: [1, 2, 3, 4, 6], maxPages: 2 };
    const before = albumOf(
      Array.from({ length: 9 }, (_, i) => `a${i}`),
      Array.from({ length: 9 }, (_, i) => `b${i}`),
    );
    const result = migrateAlbumToConfig(before, config);

    expect(result.state).toBe(before);
    expect(result.warnings[0].code).toBe('max_pages_reached');
  });
});

describe('deleteOverflow', () => {
  it('borra el excedente y reporta cuántas fotos se eliminaron', () => {
    const before = albumOf(Array.from({ length: 9 }, (_, i) => `a${i}`));
    const result = deleteOverflow(before, 0, 4);

    expect(result.state[0].photos.length).toBe(4);
    expect(result.state[0].variant).toBe(4);
    expect(result.warnings).toEqual([{ code: 'photos_deleted', count: 5 }]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Huecos intermedios: borrar una foto deja un '' en su índice. Al reducir el
// layout hay que cerrarlos y reacomodar, no tratarlos como excedente.
// ─────────────────────────────────────────────────────────────────────────────

describe('occupiedSlotCount', () => {
  it('no cuenta los huecos', () => {
    expect(occupiedSlotCount(page(['A', '', 'C']))).toBe(2);
    expect(occupiedSlotCount(page(['A', 'B', 'C']))).toBe(3);
    expect(occupiedSlotCount(page([]))).toBe(0);
  });

  it('cuenta como ocupado el slot que solo tiene caja de texto', () => {
    expect(occupiedSlotCount(page(['A', '', 'C'], { texts: { 1: { content: 'hola' } } }))).toBe(3);
  });

  it('ve las cajas de texto más allá del final del array de fotos', () => {
    // Tras borrar la última foto se recortan los vacíos finales, así que un
    // texto puede quedar en un índice que ya no existe en `photos`.
    expect(occupiedSlotCount(page(['A'], { texts: { 2: { content: 'pie' } } }))).toBe(2);
  });
});

describe('compactPage', () => {
  it('sube las fotos y arrastra crops y firmas', () => {
    const before = albumOf(['A', '', 'C']);
    before[0].crops = { 0: { x: 1 }, 2: { x: 3 } };

    const after = compactPage(before, 0);

    expect(after[0].photos).toEqual(['A', 'C']);
    expect(after[0].signatures).toEqual(['sig:A', 'sig:C']);
    expect(after[0].crops).toEqual({ 0: { x: 1 }, 1: { x: 3 } });
  });

  it('conserva las cajas de texto y su posición relativa', () => {
    const before = albumOf(['', '', 'C']);
    before[0].texts = { 0: { content: 'titulo' } };

    const after = compactPage(before, 0);

    expect(after[0].photos).toEqual(['', 'C']);
    expect(after[0].texts).toEqual({ 0: { content: 'titulo' } });
  });

  it('recupera una caja de texto que quedó más allá del array de fotos', () => {
    const before = albumOf(['A']);
    before[0].texts = { 2: { content: 'pie' } };

    const after = compactPage(before, 0);

    expect(after[0].photos).toEqual(['A', '']);
    expect(after[0].texts).toEqual({ 1: { content: 'pie' } });
  });

  it('devuelve el mismo estado si no hay huecos', () => {
    const before = albumOf(['A', 'B', 'C']);
    expect(compactPage(before, 0)).toBe(before);
  });

  it('no toca layout ni variant (R3)', () => {
    const before = albumOf(['A', '', 'C']);
    before[0].layout = 'column';
    before[0].variant = 3;

    const after = compactPage(before, 0);

    expect(after[0].layout).toBe('column');
    expect(after[0].variant).toBe(3);
  });

  it('no muta el estado de entrada', () => {
    const before = albumOf(['A', '', 'C']);
    compactPage(before, 0);
    expect(before[0].photos).toEqual(['A', '', 'C']);
  });

  it('no pierde fotos y solo compacta la página indicada (R1)', () => {
    const before = albumOf(['A', '', 'C'], ['D', '', 'F']);
    const after = compactPage(before, 0);

    expect(bag(after)).toEqual(bag(before));
    expect(after[1].photos).toEqual(['D', '', 'F']);
  });
});

describe('reducir el layout con un hueco intermedio', () => {
  it('deleteOverflow tras compactar conserva las fotos reales que caben', () => {
    // Página de 3 slots, se borró la del medio, se reduce a 2: antes se perdía
    // 'C' y el hueco se quedaba. Ahora caben las dos fotos reales.
    const before = albumOf(['A', '', 'C']);
    const result = deleteOverflow(compactPage(before, 0), 0, 2);

    expect(result.state[0].photos).toEqual(['A', 'C']);
    expect(result.state[0].variant).toBe(2);
    expect(result.warnings).toEqual([]);
  });

  it('con excedente real, lo sobrante es la última foto tras compactar', () => {
    const before = albumOf(['A', '', 'C']);
    const result = deleteOverflow(compactPage(before, 0), 0, 1);

    expect(result.state[0].photos).toEqual(['A']);
    expect(result.warnings).toEqual([{ code: 'photos_deleted', count: 1 }]);
  });

  it('rippleShift tras compactar desplaza la foto real, no el hueco', () => {
    const before = albumOf(['A', '', 'C'], ['D']);
    const result = rippleShift(compactPage(before, 0), 0, 1, RECT);

    expect(result.state[0].photos).toEqual(['A']);
    expect(result.state[1].photos).toEqual(['C', 'D']);
    expect(bag(result.state)).toEqual(bag(before));
    expect(hidesPhotos(result.state, RECT)).toBe(false);
  });

  it('moveOverflowToPage tras compactar envía la foto real', () => {
    const before = albumOf(['A', '', 'C'], ['D']);
    const result = moveOverflowToPage(compactPage(before, 0), 0, 1, 1, RECT);

    expect(result.state[0].photos).toEqual(['A']);
    expect(result.state[1].photos).toEqual(['D', 'C']);
    expect(bag(result.state)).toEqual(bag(before));
  });
});
