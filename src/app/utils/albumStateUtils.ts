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

// ── helpers ──────────────────────────────────────────────────────────────────

export function getNextAllowed(count: number, allowed: number[]): number {
  for (const opt of allowed) {
    if (opt >= count) return opt;
  }
  return allowed[allowed.length - 1];
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

export function deleteOverflow(state: AlbumState, pageIndex: number, newVariant: number): AlbumState {
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
  return next;
}

// ── move overflow to a specific target page ───────────────────────────────────

export function moveOverflowToPage(
  state: AlbumState,
  pageIndex: number,
  newVariant: number,
  targetPage: number,
  config: AlbumConfig,
  onPageCountChange?: (count: number) => void
): AlbumState {
  const next = cloneState(state);
  const source = next[pageIndex];
  const maxAllowed = config.allowedPhotosPerPage[config.allowedPhotosPerPage.length - 1];

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

  if (overflowData.length === 0) return next;

  // Ensure target page exists (expand album if needed)
  while (next.length <= targetPage) {
    if (next.length >= config.maxPages) {
      alert('Límite máximo de ' + config.maxPages + ' páginas alcanzado. Algunas fotos no se pudieron acomodar.');
      return next;
    }
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

  // If target still overflows after capping, cascade the remainder
  if (target.photos.length > maxAllowed) {
    return rippleShift(next, targetPage, maxAllowed, config, onPageCountChange);
  }

  return next;
}

// ── ripple shift (cascade overflow downstream) ────────────────────────────────

export function rippleShift(
  state: AlbumState,
  startIndex: number,
  newVariant: number,
  config: AlbumConfig,
  onPageCountChange?: (count: number) => void
): AlbumState {
  const next = cloneState(state);
  const maxAllowed = config.allowedPhotosPerPage[config.allowedPhotosPerPage.length - 1];

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

  while (pending.length > 0) {
    // Expand album by two pages if needed (albums must stay even-count)
    if (p >= next.length) {
      if (next.length >= config.maxPages) {
        alert('Límite máximo de ' + config.maxPages + ' páginas alcanzado. Algunas fotos no se pudieron acomodar.');
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

  return next;
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
