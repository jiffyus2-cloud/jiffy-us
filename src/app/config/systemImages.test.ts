import { describe, it, expect } from 'vitest';
import {
  SYSTEM_IMAGE_SLOTS,
  SYSTEM_IMAGE_GALLERIES,
  SYSTEM_IMAGE_GROUPS,
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from './systemImages';

/**
 * El id de cada entrada es la clave con la que se guarda la sustitución en
 * Firestore: si se repite o se renombra, la imagen que ya cambió la
 * administración deja de aplicarse (o se aplica al sitio equivocado). Estos
 * tests son la red que protege ese contrato.
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

  it('cada slot trae una imagen por defecto resoluble', () => {
    for (const slot of SYSTEM_IMAGE_SLOTS) {
      expect(typeof slot.defaultUrl).toBe('string');
      expect(slot.defaultUrl.length).toBeGreaterThan(0);
    }
  });

  it('las galerías traen sus carpetas por defecto', () => {
    for (const gallery of SYSTEM_IMAGE_GALLERIES) {
      expect(Array.isArray(gallery.defaultUrls)).toBe(true);
      // Las carpetas del bundle no están vacías; si alguna lo estuviera, la
      // muestra correspondiente saldría en blanco en la tienda.
      expect(gallery.defaultUrls.length).toBeGreaterThan(0);
    }
  });

  it('todos los grupos declarados se usan (ninguna pestaña vacía en el panel)', () => {
    for (const group of SYSTEM_IMAGE_GROUPS) {
      expect(allEntries.some(entry => entry.group === group)).toBe(true);
    }
  });

  it('solo acepta formatos de imagen web y un tamaño razonable', () => {
    expect(ACCEPTED_IMAGE_TYPES.every(type => type.startsWith('image/'))).toBe(true);
    expect(MAX_IMAGE_BYTES).toBeGreaterThan(1024 * 1024);
  });
});
