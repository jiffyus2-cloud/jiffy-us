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

  it('cada slot trae una imagen inicial resoluble', () => {
    for (const slot of SYSTEM_IMAGE_SLOTS) {
      expect(typeof slot.defaultUrl).toBe('string');
      expect(slot.defaultUrl.length).toBeGreaterThan(0);
    }
  });

  it('las galerías arrancan con referencias del bundle, no con URLs con hash', () => {
    for (const gallery of SYSTEM_IMAGE_GALLERIES) {
      // Si una carpeta llegara vacía, esa muestra saldría en blanco en la tienda.
      expect(gallery.defaultRefs.length).toBeGreaterThan(0);
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
  it('no repite ids de diapositiva', () => {
    const ids = DEFAULT_CAROUSEL_SLIDES.map(slide => slide.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada diapositiva trae imagen resoluble y sus tres textos', () => {
    for (const slide of DEFAULT_CAROUSEL_SLIDES) {
      expect(resolveImageRef(slide.ref)).not.toBe('');
      expect(slide.title.trim()).not.toBe('');
      expect(slide.description.trim()).not.toBe('');
      expect(slide.cta.trim()).not.toBe('');
    }
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
    const ref = DEFAULT_CAROUSEL_SLIDES[0].ref;
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
