import { describe, it, expect } from 'vitest';
import {
  SYSTEM_IMAGE_SLOTS,
  SYSTEM_IMAGE_GALLERIES,
  SYSTEM_IMAGE_GROUPS,
  DEFAULT_CAROUSEL_SLIDES,
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  INITIAL_REF_PREFIX,
  resolveImageRef,
  isUploadedRef,
  resolveSlotImage,
} from './systemImages';

/**
 * El id de cada entrada es la clave con la que se guarda el cambio en Firestore:
 * si se repite o se renombra, la imagen que ya cambió la administración deja de
 * aplicarse (o se aplica al sitio equivocado). Estos tests son la red que
 * protege ese contrato.
 */
describe('catálogo de imágenes del sistema', () => {
  const allEntries = [...SYSTEM_IMAGE_SLOTS, ...SYSTEM_IMAGE_GALLERIES];

  it('no repite ids entre slots y galerías', () => {
    const ids = allEntries.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada entrada tiene etiqueta, pista y grupo conocido', () => {
    for (const entry of allEntries) {
      expect(entry.label.trim()).not.toBe('');
      expect(entry.hint.trim()).not.toBe('');
      expect(SYSTEM_IMAGE_GROUPS).toContain(entry.group);
    }
  });

  it('la imagen inicial de cada slot es una URL del bundle o vacía (sin original)', () => {
    for (const slot of SYSTEM_IMAGE_SLOTS) {
      expect(typeof slot.defaultUrl).toBe('string');
      expect(slot.defaultUrl.startsWith(INITIAL_REF_PREFIX)).toBe(false);
    }
    // Las que siguen en uso en la tienda no se pueden perder por accidente.
    const withOriginal = SYSTEM_IMAGE_SLOTS.filter(slot => slot.defaultUrl !== '').map(slot => slot.id);
    expect(withOriginal).toEqual(['landing.product.album', 'organizer.upload.mascot']);
  });

  it('las galerías arrancan con referencias del bundle, no con URLs con hash', () => {
    // La de clientes conserva sus originales; Papel y Tela ya no tienen.
    expect(SYSTEM_IMAGE_GALLERIES.find(g => g.id === 'samples.clientes')!.defaultRefs.length).toBeGreaterThan(0);
    for (const gallery of SYSTEM_IMAGE_GALLERIES) {
      for (const ref of gallery.defaultRefs) {
        expect(ref.startsWith(INITIAL_REF_PREFIX)).toBe(true);
        expect(resolveImageRef(ref)).not.toBe('');
      }
    }
  });

  it('todos los grupos declarados se usan (ninguna sección vacía en el panel)', () => {
    for (const group of SYSTEM_IMAGE_GROUPS) {
      const used = allEntries.some(entry => entry.group === group);
      // 'Portada' la ocupa el carrusel, que no es slot ni galería.
      expect(used || group === 'Portada').toBe(true);
    }
  });

  it('solo acepta formatos de imagen web y un tamaño razonable', () => {
    expect(ACCEPTED_IMAGE_TYPES.every(type => type.startsWith('image/'))).toBe(true);
    expect(MAX_IMAGE_BYTES).toBeGreaterThan(1024 * 1024);
  });
});

describe('carrusel inicial', () => {
  it('está vacío: las diapositivas viven en Firestore', () => {
    expect(DEFAULT_CAROUSEL_SLIDES).toEqual([]);
  });
});

/**
 * Guardar en Firestore la URL de una imagen del bundle la mataría en el
 * siguiente despliegue (Vite le cambia el hash). Por eso lo inicial se guarda
 * como referencia y se resuelve en tiempo de ejecución.
 */
describe('resolveImageRef', () => {
  it('devuelve tal cual lo que subió la administración', () => {
    const url = 'https://firebasestorage.googleapis.com/v0/b/x/o/system_images%2Ffoto.jpg?alt=media';
    expect(resolveImageRef(url)).toBe(url);
    expect(isUploadedRef(url)).toBe(true);
  });

  it('resuelve una referencia inicial contra el bundle actual', () => {
    const ref = SYSTEM_IMAGE_GALLERIES.find(g => g.id === 'samples.clientes')!.defaultRefs[0];
    expect(ref.startsWith(INITIAL_REF_PREFIX)).toBe(true);
    expect(isUploadedRef(ref)).toBe(false);
    expect(resolveImageRef(ref)).not.toBe('');
    expect(resolveImageRef(ref).startsWith(INITIAL_REF_PREFIX)).toBe(false);
  });

  it('devuelve cadena vacía si la imagen inicial ya no existe en el código', () => {
    expect(resolveImageRef(`${INITIAL_REF_PREFIX}Carpeta/borrada.jpg`)).toBe('');
    expect(resolveImageRef('')).toBe('');
    expect(resolveImageRef(null)).toBe('');
    expect(resolveImageRef(undefined)).toBe('');
  });
});

/**
 * Un slot con `inheritsFrom` nace de separar dos huecos que compartían foto
 * (p. ej. la tarjeta del Álbum Personalizado usaba la del álbum normal): hasta
 * que la administración suba la suya, tiene que verse igual que antes.
 */
describe('resolveSlotImage', () => {
  const uploaded = 'https://firebasestorage.googleapis.com/v0/b/x/o/system_images%2Fa.jpg?alt=media';
  const own = 'https://firebasestorage.googleapis.com/v0/b/x/o/system_images%2Fb.jpg?alt=media';

  it('cada inheritsFrom apunta a un slot existente y distinto', () => {
    const ids = SYSTEM_IMAGE_SLOTS.map(slot => slot.id as string);
    for (const slot of SYSTEM_IMAGE_SLOTS as readonly { id: string; inheritsFrom?: string }[]) {
      if (!slot.inheritsFrom) continue;
      expect(ids).toContain(slot.inheritsFrom);
      expect(slot.inheritsFrom).not.toBe(slot.id);
    }
  });

  it('sin nada subido y sin original, queda vacío (la tienda pinta el logo de espera)', () => {
    expect(resolveSlotImage({}, 'creator.product.customAlbum')).toBe('');
  });

  it('hereda la imagen que la administración subió para el álbum', () => {
    expect(resolveSlotImage({ 'creator.product.album': uploaded }, 'creator.product.customAlbum')).toBe(uploaded);
  });

  it('su propia imagen manda sobre la heredada, y no toca la del álbum', () => {
    const images = { 'creator.product.album': uploaded, 'creator.product.customAlbum': own };
    expect(resolveSlotImage(images, 'creator.product.customAlbum')).toBe(own);
    expect(resolveSlotImage(images, 'creator.product.album')).toBe(uploaded);
  });
});
