// ============================================================================
// Album State Utilities
// ============================================================================
// Unified abstraction for all photo-ordering operations in PhotoOrganizer.
// The AlbumState type encapsulates all per-page data in a single object so
// every reordering operation keeps photos, crops, texts, layout, variant, and
// duplicate-detection signatures in sync atomically.
// ============================================================================

export interface PageState {
  photos: string[];
  crops: Record<number, any>;     // photoIndex → crop data
  texts: Record<number, any>;     // photoIndex → text box data
  layout?: 'grid' | 'row' | 'column';
  variant?: number;
  signatures: string[];           // same length / order as photos
}

export type AlbumState = PageState[];

export interface AlbumConfig {
  allowedPhotosPerPage: number[]; // e.g. [1,2,3,4,9] or [1,2,3,4,6]
  maxPages: number;               // 250
}

/**
 * Avisos que una operación devuelve al llamante. Antes estas situaciones se
 * comunicaban con `alert()` desde dentro de estas funciones puras: bloqueaba el
 * hilo en mitad de una transformación de estado y hacía imposible testearlas.
 */
export type AlbumWarning =
  | { code: 'max_pages_reached'; unplacedPhotos: number }
  | { code: 'photos_moved'; count: number; toPage: number }
  | { code: 'photos_deleted'; count: number }
  | { code: 'refused_photo_deletion'; pages: number[] };

export interface AlbumOpResult {
  state: AlbumState;
  warnings: AlbumWarning[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

export function getNextAllowed(count: number, allowed: number[]): number {
  for (const opt of allowed) {
    if (opt >= count) return opt;
  }
  return allowed[allowed.length - 1];
}

function maxPhotosPerPage(config: AlbumConfig): number {
  return config.allowedPhotosPerPage[config.allowedPhotosPerPage.length - 1];
}

/**
 * Cuántas fotos más caben desde `fromIndex` hasta el final, contando también las
 * páginas que todavía se podrían añadir (siempre de dos en dos: los álbumes
 * mantienen un número par de páginas).
 *
 * Se usa para decidir ANTES de tocar nada si una operación cabe. Sin esto, el
 * `splice` del excedente se ejecutaba primero y, al toparse con el límite de
 * páginas, esas fotos ya extraídas se descartaban para siempre.
 */
export function freeCapacityFrom(state: AlbumState, fromIndex: number, config: AlbumConfig): number {
  const max = maxPhotosPerPage(config);
  let capacity = 0;
  for (let i = Math.max(0, fromIndex); i < state.length; i++) {
    capacity += Math.max(0, max - state[i].photos.length);
  }
  const addable = Math.max(0, config.maxPages - state.length);
  return capacity + (addable - (addable % 2)) * max;
}

function countPhotos(state: AlbumState): number {
  return state.reduce((n, p) => n + p.photos.filter(ph => ph && ph.trim() !== '').length, 0);
}

function clonePage(page: PageState): PageState {
  return {
    photos: [...page.photos],
    crops: { ...page.crops },
    texts: { ...page.texts },
    layout: page.layout,
    variant: page.variant,
    signatures: [...page.signatures],
  };
}

function cloneState(state: AlbumState): AlbumState {
  return state.map(clonePage);
}

function blankPage(): PageState {
  return { photos: [], crops: {}, texts: {}, signatures: [] };
}

// ── converters ────────────────────────────────────────────────────────────────

export function fromPropsToAlbumState(
  photos: string[][],
  photoCrops: Record<string, any>,
  textBoxSlots: Record<number, Record<number, any>>,
  pageLayouts: Record<number, 'grid' | 'row' | 'column'>,
  pageLayoutVariants: Record<number, number>,
  fileSignatures: string[][]
): AlbumState {
  const pageCount = photos.length;

  // Build per-page crop maps (use indexOf to handle multi-digit page indices)
  const cropsPerPage: Record<number, Record<number, any>> = {};
  for (const key of Object.keys(photoCrops)) {
    const dash = key.indexOf('-');
    if (dash === -1) continue;
    const pageNum = Number(key.substring(0, dash));
    const photoNum = Number(key.substring(dash + 1));
    if (!cropsPerPage[pageNum]) cropsPerPage[pageNum] = {};
    cropsPerPage[pageNum][photoNum] = photoCrops[key];
  }

  return Array.from({ length: pageCount }, (_, i) => ({
    photos: [...(photos[i] ?? [])],
    crops: { ...(cropsPerPage[i] ?? {}) },
    texts: { ...(textBoxSlots[i] ?? {}) },
    layout: pageLayouts[i],
    variant: pageLayoutVariants[i],
    signatures: [...(fileSignatures[i] ?? [])],
  }));
}

export function fromAlbumStateToProps(state: AlbumState): {
  photos: string[][];
  photoCrops: Record<string, any>;
  textBoxSlots: Record<number, Record<number, any>>;
  pageLayouts: Record<number, 'grid' | 'row' | 'column'>;
  pageLayoutVariants: Record<number, number>;
  fileSignatures: string[][];
} {
  const photos: string[][] = [];
  const photoCrops: Record<string, any> = {};
  const textBoxSlots: Record<number, Record<number, any>> = {};
  const pageLayouts: Record<number, 'grid' | 'row' | 'column'> = {};
  const pageLayoutVariants: Record<number, number> = {};
  const fileSignatures: string[][] = [];

  state.forEach((page, i) => {
    photos.push([...page.photos]);
    fileSignatures.push([...page.signatures]);

    for (const photoIdx of Object.keys(page.crops)) {
      photoCrops[`${i}-${photoIdx}`] = page.crops[Number(photoIdx)];
    }

    if (Object.keys(page.texts).length > 0) {
      textBoxSlots[i] = { ...page.texts };
    }

    if (page.layout !== undefined) {
      pageLayouts[i] = page.layout;
    }

    if (page.variant !== undefined) {
      pageLayoutVariants[i] = page.variant;
    }
  });

  return { photos, photoCrops, textBoxSlots, pageLayouts, pageLayoutVariants, fileSignatures };
}

// ── swap photos within a page ─────────────────────────────────────────────────

export function swapPhotosOnPage(
  state: AlbumState,
  pageIndex: number,
  fromIdx: number,
  toIdx: number
): AlbumState {
  if (fromIdx === toIdx) return state;

  const next = cloneState(state);
  const page = next[pageIndex];

  // Pad arrays to cover both indices
  while (page.photos.length <= Math.max(fromIdx, toIdx)) {
    page.photos.push('');
    page.signatures.push('');
  }

  // Swap photos and signatures
  [page.photos[fromIdx], page.photos[toIdx]] = [page.photos[toIdx], page.photos[fromIdx]];
  [page.signatures[fromIdx], page.signatures[toIdx]] = [page.signatures[toIdx], page.signatures[fromIdx]];

  // Swap crops
  const cA = page.crops[fromIdx];
  const cB = page.crops[toIdx];
  if (cB !== undefined) page.crops[fromIdx] = cB; else delete page.crops[fromIdx];
  if (cA !== undefined) page.crops[toIdx] = cA; else delete page.crops[toIdx];

  // Swap texts
  const tA = page.texts[fromIdx];
  const tB = page.texts[toIdx];
  if (tB !== undefined) page.texts[fromIdx] = tB; else delete page.texts[fromIdx];
  if (tA !== undefined) page.texts[toIdx] = tA; else delete page.texts[toIdx];

  // Trim trailing empty slots
  while (
    page.photos.length > 0 &&
    (!page.photos[page.photos.length - 1] || page.photos[page.photos.length - 1].trim() === '')
  ) {
    const lastIdx = page.photos.length - 1;
    page.photos.pop();
    page.signatures.pop();
    delete page.crops[lastIdx];
    delete page.texts[lastIdx];
  }

  return next;
}

// ── insert blank pages at an arbitrary position ───────────────────────────────

export function insertBlankPages(state: AlbumState, afterIndex: number, count: number): AlbumState {
  const next = cloneState(state);
  const blanks = Array.from({ length: count }, () => blankPage());
  next.splice(afterIndex + 1, 0, ...blanks);
  return next;
}

// ── move a single photo (with its crop/text/signature) to another page ───────

export function movePhotoToPage(
  state: AlbumState,
  fromPage: number,
  fromPhoto: number,
  toPage: number,
  config: AlbumConfig
): { state: AlbumState; success: boolean } {
  if (fromPage === toPage) return { state, success: false };
  if (!state[fromPage] || !state[toPage]) return { state, success: false };

  const photo = state[fromPage].photos[fromPhoto];
  if (!photo || photo.trim() === '') return { state, success: false };

  // Determine target slot before mutating anything, so a full target page
  // is rejected without touching the source page at all.
  const maxAllowed = config.allowedPhotosPerPage[config.allowedPhotosPerPage.length - 1];
  const targetPhotos = state[toPage].photos;
  let targetIdx = targetPhotos.findIndex(p => !p || p.trim() === '');
  if (targetIdx === -1) {
    if (targetPhotos.length >= maxAllowed) return { state, success: false };
    targetIdx = targetPhotos.length;
  }

  const next = cloneState(state);
  const source = next[fromPage];
  const target = next[toPage];

  const crop = source.crops[fromPhoto];
  const text = source.texts[fromPhoto];
  const sig = source.signatures[fromPhoto];

  // Blank the source slot (mirrors handleRemovePhotoFromPage: positional
  // slots are not shifted, only trailing empties are trimmed).
  source.photos[fromPhoto] = '';
  delete source.crops[fromPhoto];
  delete source.texts[fromPhoto];
  source.signatures[fromPhoto] = '';

  while (
    source.photos.length > 0 &&
    (!source.photos[source.photos.length - 1] || source.photos[source.photos.length - 1].trim() === '')
  ) {
    const lastIdx = source.photos.length - 1;
    source.photos.pop();
    source.signatures.pop();
    delete source.crops[lastIdx];
    delete source.texts[lastIdx];
  }

  while (target.photos.length <= targetIdx) {
    target.photos.push('');
    target.signatures.push('');
  }
  target.photos[targetIdx] = photo;
  target.signatures[targetIdx] = sig ?? '';
  if (crop !== undefined) target.crops[targetIdx] = crop;
  if (text !== undefined) target.texts[targetIdx] = text;

  const neededVariant = getNextAllowed(target.photos.length, config.allowedPhotosPerPage);
  const prevVariant = target.variant ?? neededVariant;
  target.variant = Math.min(Math.max(prevVariant, neededVariant), maxAllowed);

  // Defensive check: the destination page must actually contain the photo we
  // just moved. If not, fail loudly instead of silently "losing" the photo.
  if (target.photos[targetIdx] !== photo) {
    throw new Error('movePhotoToPage: fallo al colocar la foto en la página destino');
  }

  return { state: next, success: true };
}

// ── swap two pages ────────────────────────────────────────────────────────────

export function swapPages(state: AlbumState, a: number, b: number): AlbumState {
  if (a === b) return state;
  const next = cloneState(state);
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

// ── move page to a different index ────────────────────────────────────────────

export function movePageToIndex(state: AlbumState, fromIdx: number, toIdx: number): AlbumState {
  if (fromIdx === toIdx) return state;
  const next = cloneState(state);
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

// ── delete overflow (shrink variant, discard excess photos) ───────────────────

export function deleteOverflow(state: AlbumState, pageIndex: number, newVariant: number): AlbumOpResult {
  const next = cloneState(state);
  const page = next[pageIndex];

  // Remove photos beyond newVariant
  const removed = page.photos.splice(newVariant);
  page.signatures.splice(newVariant);

  removed.forEach((_, i) => {
    const oldIdx = newVariant + i;
    delete page.crops[oldIdx];
    delete page.texts[oldIdx];
  });

  page.variant = newVariant;

  const deleted = removed.filter(p => p && p.trim() !== '').length;
  return {
    state: next,
    warnings: deleted > 0 ? [{ code: 'photos_deleted', count: deleted }] : [],
  };
}

// ── move overflow to a specific target page ───────────────────────────────────

export function moveOverflowToPage(
  state: AlbumState,
  pageIndex: number,
  newVariant: number,
  targetPage: number,
  config: AlbumConfig,
  onPageCountChange?: (count: number) => void
): AlbumOpResult {
  const maxAllowed = maxPhotosPerPage(config);
  const overflowCount = Math.max(0, state[pageIndex].photos.length - newVariant);

  // Precomprobación: si el álbum tendría que crecer más allá de maxPages para
  // alojar la página destino, no tocamos NADA. Antes el splice ya se había
  // ejecutado a estas alturas y el excedente se perdía.
  if (overflowCount > 0 && targetPage >= state.length) {
    const pagesNeeded = targetPage + 1 - state.length;
    const pagesAvailable = Math.max(0, config.maxPages - state.length);
    if (pagesNeeded > pagesAvailable - (pagesAvailable % 2)) {
      return { state, warnings: [{ code: 'max_pages_reached', unplacedPhotos: overflowCount }] };
    }
  }

  const next = cloneState(state);
  const source = next[pageIndex];

  // Extract overflow items from source
  const overflowPhotos = source.photos.splice(newVariant);
  const overflowSigs = source.signatures.splice(newVariant);
  const overflowData = overflowPhotos.map((photo, i) => {
    const oldIdx = newVariant + i;
    const crop = source.crops[oldIdx];
    const text = source.texts[oldIdx];
    delete source.crops[oldIdx];
    delete source.texts[oldIdx];
    return { photo, sig: overflowSigs[i] ?? '', crop, text };
  });

  source.variant = newVariant;

  if (overflowData.length === 0) return { state: next, warnings: [] };

  // Ensure target page exists (expand album if needed)
  while (next.length <= targetPage) {
    next.push(blankPage(), blankPage());
    onPageCountChange?.(next.length);
  }

  const target = next[targetPage];
  const baseIdx = target.photos.length;

  // Append overflow to target
  overflowData.forEach(({ photo, sig, crop, text }, i) => {
    target.photos.push(photo);
    target.signatures.push(sig);
    if (crop !== undefined) target.crops[baseIdx + i] = crop;
    if (text !== undefined) target.texts[baseIdx + i] = text;
  });

  // Ensure target variant covers the new count (R1: never hide photos)
  const minNeeded = getNextAllowed(target.photos.length, config.allowedPhotosPerPage);
  const prevVariant = target.variant ?? minNeeded;
  target.variant = Math.min(Math.max(prevVariant, minNeeded), maxAllowed);

  const moved: AlbumWarning = {
    code: 'photos_moved',
    count: overflowData.filter(d => d.photo && d.photo.trim() !== '').length,
    toPage: targetPage,
  };

  // If target still overflows after capping, cascade the remainder
  if (target.photos.length > maxAllowed) {
    const cascaded = rippleShift(next, targetPage, maxAllowed, config, onPageCountChange);
    // La cascada no cupo: revertimos la operación completa en vez de dejar el
    // estado a medias con fotos perdidas por el camino.
    if (cascaded.warnings.some(w => w.code === 'max_pages_reached')) {
      return { state, warnings: cascaded.warnings };
    }
    return { state: cascaded.state, warnings: [moved, ...cascaded.warnings] };
  }

  return { state: next, warnings: [moved] };
}

// ── ripple shift (cascade overflow downstream) ────────────────────────────────

export function rippleShift(
  state: AlbumState,
  startIndex: number,
  newVariant: number,
  config: AlbumConfig,
  onPageCountChange?: (count: number) => void
): AlbumOpResult {
  const maxAllowed = maxPhotosPerPage(config);

  // Precomprobación (ver freeCapacityFrom): o cabe todo, o no se toca nada.
  const overflowCount = Math.max(0, state[startIndex].photos.length - newVariant);
  if (overflowCount > freeCapacityFrom(state, startIndex + 1, config)) {
    return { state, warnings: [{ code: 'max_pages_reached', unplacedPhotos: overflowCount }] };
  }

  const next = cloneState(state);

  // Phase 1 — extract overflow from startIndex
  const source = next[startIndex];
  const overflowPhotos = source.photos.splice(newVariant);
  const overflowSigs = source.signatures.splice(newVariant);
  const overflowData = overflowPhotos.map((photo, i) => {
    const oldIdx = newVariant + i;
    const crop = source.crops[oldIdx];
    const text = source.texts[oldIdx];
    delete source.crops[oldIdx];
    delete source.texts[oldIdx];
    return { photo, sig: overflowSigs[i] ?? '', crop, text };
  });
  // R3: source layout is preserved; only variant changes
  source.variant = newVariant;

  // Phase 2 — cascade
  let p = startIndex + 1;
  let pending = overflowData;
  let hitLimit = false;

  while (pending.length > 0) {
    // Expand album by two pages if needed (albums must stay even-count)
    if (p >= next.length) {
      if (next.length >= config.maxPages) {
        hitLimit = true;
        break;
      }
      next.push(blankPage(), blankPage());
      onPageCountChange?.(next.length);
    }

    const page = next[p];
    const insertCount = pending.length;
    const existingCount = page.photos.length;

    // Shift existing data right to make room at position 0 (process high→low)
    for (let i = existingCount - 1; i >= 0; i--) {
      const newI = i + insertCount;
      if (page.crops[i] !== undefined) {
        page.crops[newI] = page.crops[i];
        delete page.crops[i];
      }
      if (page.texts[i] !== undefined) {
        page.texts[newI] = page.texts[i];
        delete page.texts[i];
      }
    }

    // Insert pending photos at the beginning
    page.photos = [...pending.map(d => d.photo), ...page.photos];
    page.signatures = [...pending.map(d => d.sig), ...page.signatures];
    pending.forEach((d, i) => {
      if (d.crop !== undefined) page.crops[i] = d.crop;
      if (d.text !== undefined) page.texts[i] = d.text;
    });

    // R1: if count > maxAllowed, extract new overflow and continue cascade
    if (page.photos.length > maxAllowed) {
      const newOverflowPhotos = page.photos.splice(maxAllowed);
      const newOverflowSigs = page.signatures.splice(maxAllowed);
      pending = newOverflowPhotos.map((photo, i) => {
        const oldIdx = maxAllowed + i;
        const crop = page.crops[oldIdx];
        const text = page.texts[oldIdx];
        delete page.crops[oldIdx];
        delete page.texts[oldIdx];
        return { photo, sig: newOverflowSigs[i] ?? '', crop, text };
      });
      page.variant = maxAllowed;
    } else {
      // R2: new variant = max(prevVariant, getNextAllowed(count))
      const minNeeded = getNextAllowed(page.photos.length, config.allowedPhotosPerPage);
      const prevVariant = page.variant ?? minNeeded;
      page.variant = Math.max(prevVariant, minNeeded);
      pending = [];
    }
    // R3: page.layout is never touched

    p++;
  }

  // Cinturón de seguridad: si algo quedó sin colocar (la precomprobación debería
  // haberlo impedido), devolvemos el estado ORIGINAL. Nunca un estado intermedio
  // al que le faltan fotos.
  if (hitLimit || pending.length > 0) {
    return {
      state,
      warnings: [{ code: 'max_pages_reached', unplacedPhotos: pending.length }],
    };
  }

  return { state: next, warnings: [] };
}

// ── delete pages ──────────────────────────────────────────────────────────────

/**
 * Borra páginas por índice reindexando crops/textos/layouts de forma atómica.
 * Sustituye el reindexado manual que había en PhotoOrganizer, que parseaba las
 * claves `"pagina-foto"` con `split('-')[1]` y se rompía con índices de dos cifras.
 *
 * Con `allowPhotoDeletion` a false (el valor por defecto) la operación es un no-op
 * si alguna página objetivo contiene fotos: borrar fotos siempre debe ser una
 * decisión explícita del usuario, nunca un efecto colateral.
 */
export function deletePages(
  state: AlbumState,
  indices: number[],
  opts?: { allowPhotoDeletion?: boolean }
): AlbumOpResult {
  const unique = Array.from(new Set(indices)).filter(i => i >= 0 && i < state.length);
  if (unique.length === 0) return { state, warnings: [] };

  const withPhotos = unique.filter(i =>
    state[i].photos.some(p => p && p.trim() !== '') || Object.keys(state[i].texts).length > 0
  );

  if (withPhotos.length > 0 && !opts?.allowPhotoDeletion) {
    return { state, warnings: [{ code: 'refused_photo_deletion', pages: withPhotos }] };
  }

  const toDelete = new Set(unique);
  const next = state.filter((_, i) => !toDelete.has(i)).map(clonePage);

  const deletedPhotos = unique.reduce(
    (n, i) => n + state[i].photos.filter(p => p && p.trim() !== '').length,
    0
  );

  return {
    state: next,
    warnings: deletedPhotos > 0 ? [{ code: 'photos_deleted', count: deletedPhotos }] : [],
  };
}

// ── album size / config change ────────────────────────────────────────────────

/**
 * Qué pasaría al aplicar una configuración distinta (p. ej. pasar de un álbum
 * cuadrado, que admite hasta 9 fotos por página, a uno horizontal que solo admite 6).
 */
export function analyzeConfigChange(
  state: AlbumState,
  to: AlbumConfig
): { pagesAffected: number[]; photosAtRisk: number; estimatedNewPages: number } {
  const max = maxPhotosPerPage(to);
  const pagesAffected: number[] = [];
  let photosAtRisk = 0;

  state.forEach((page, i) => {
    const real = page.photos.filter(p => p && p.trim() !== '').length;
    if (real > max) {
      pagesAffected.push(i);
      photosAtRisk += real - max;
    }
  });

  // Las páginas se añaden de dos en dos.
  const free = state.reduce((n, p) => n + Math.max(0, max - p.photos.length), 0);
  const stillNeeded = Math.max(0, photosAtRisk - free);
  const estimatedNewPages = Math.ceil(Math.ceil(stillNeeded / max) / 2) * 2;

  return { pagesAffected, photosAtRisk, estimatedNewPages };
}

/**
 * Redistribuye el álbum para que quepa en la nueva configuración sin ocultar ni
 * perder ninguna foto. Delega en `rippleShift` en vez de reimplementar la cascada.
 */
export function migrateAlbumToConfig(
  state: AlbumState,
  to: AlbumConfig,
  onPageCountChange?: (count: number) => void
): AlbumOpResult {
  const max = maxPhotosPerPage(to);
  const before = countPhotos(state);
  let current = state;

  for (let i = 0; i < current.length; i++) {
    if (current[i].photos.length <= max) continue;
    const result = rippleShift(current, i, max, to, onPageCountChange);
    if (result.warnings.some(w => w.code === 'max_pages_reached')) {
      // No cabe: devolvemos el estado original intacto.
      return { state, warnings: result.warnings };
    }
    current = result.state;
  }

  // Normalizar variantes para que ninguna página oculte fotos (R1/R2).
  const normalized = current.map(page => {
    const needed = getNextAllowed(page.photos.length, to.allowedPhotosPerPage);
    const prev = page.variant ?? needed;
    return { ...clonePage(page), variant: Math.min(Math.max(prev, needed), max) };
  });

  if (countPhotos(normalized) !== before) {
    // Invariante rota: preferimos no aplicar nada antes que perder fotos.
    return { state, warnings: [{ code: 'max_pages_reached', unplacedPhotos: before - countPhotos(normalized) }] };
  }

  return { state: normalized, warnings: [] };
}

// ── pull shift (fill gap by pulling from next pages) ─────────────────────────

export function pullShift(
  state: AlbumState,
  startIndex: number,
  newVariant: number,
  config: AlbumConfig
): AlbumState {
  const next = cloneState(state);
  const sourcePage = next[startIndex];

  let gap = newVariant - sourcePage.photos.length;
  let p = startIndex;

  while (gap > 0 && p < next.length - 1) {
    const nextPage = next[p + 1];
    const pullCount = Math.min(gap, nextPage.photos.length);
    if (pullCount === 0) break;

    // Extract first pullCount items from nextPage
    const pulledPhotos = nextPage.photos.splice(0, pullCount);
    const pulledSigs = nextPage.signatures.splice(0, pullCount);
    const pulledData = pulledPhotos.map((photo, i) => {
      const crop = nextPage.crops[i];
      const text = nextPage.texts[i];
      delete nextPage.crops[i];
      delete nextPage.texts[i];
      return { photo, sig: pulledSigs[i] ?? '', crop, text };
    });

    // Reindex remaining items on nextPage (ascending order)
    const remaining = nextPage.photos.length;
    for (let i = 0; i < remaining; i++) {
      const oldIdx = i + pullCount;
      if (nextPage.crops[oldIdx] !== undefined) {
        nextPage.crops[i] = nextPage.crops[oldIdx];
        delete nextPage.crops[oldIdx];
      } else {
        delete nextPage.crops[i];
      }
      if (nextPage.texts[oldIdx] !== undefined) {
        nextPage.texts[i] = nextPage.texts[oldIdx];
        delete nextPage.texts[oldIdx];
      } else {
        delete nextPage.texts[i];
      }
    }
    // P3: nextPage.layout is never touched
    // P2: update nextPage variant
    nextPage.variant = getNextAllowed(nextPage.photos.length, config.allowedPhotosPerPage);

    // Append pulled items to current page (p)
    const currentPage = next[p];
    const baseIdx = currentPage.photos.length;
    pulledData.forEach(({ photo, sig, crop, text }, i) => {
      currentPage.photos.push(photo);
      currentPage.signatures.push(sig);
      if (crop !== undefined) currentPage.crops[baseIdx + i] = crop;
      if (text !== undefined) currentPage.texts[baseIdx + i] = text;
    });

    gap -= pullCount; // P1: continue pulling if gap not yet filled
    p++;
  }

  // R3: startIndex layout is never touched; only variant changes
  sourcePage.variant = newVariant;
  return next;
}
