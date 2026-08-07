import { describe, it, expect, vi } from 'vitest';

// orderService importa ../lib/firebase (que inicializa la app real con las
// variables VITE_*) y los SDK de Firestore/Storage. Aquí solo probamos los
// helpers puros, así que stubbeamos las tres cosas: los tests no deben tocar red
// ni necesitar credenciales.
vi.mock('../lib/firebase', () => ({ db: {}, storage: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), query: vi.fn(), where: vi.fn(), orderBy: vi.fn(),
  getDocs: vi.fn(), doc: vi.fn(), getDoc: vi.fn(), updateDoc: vi.fn(),
  setDoc: vi.fn(), deleteDoc: vi.fn(),
}));
vi.mock('firebase/storage', () => ({
  ref: vi.fn(), uploadString: vi.fn(), getDownloadURL: vi.fn(), uploadBytes: vi.fn(),
}));

import {
  sanitizeForFirestore,
  countAlbumPhotos,
  countPersistedPhotos,
  assertNoLocalUrls,
  SCHEMA_VERSION,
} from './orderService';

describe('countAlbumPhotos', () => {
  it('cuenta solo las fotos reales, no los huecos', () => {
    const pages = [
      { images: ['a', null, 'b'] },
      { images: [null, null] },
      { images: ['c'] },
    ];
    expect(countAlbumPhotos(pages)).toBe(3);
  });

  it('tolera entradas ausentes o malformadas', () => {
    expect(countAlbumPhotos(undefined)).toBe(0);
    expect(countAlbumPhotos(null)).toBe(0);
    expect(countAlbumPhotos([])).toBe(0);
    expect(countAlbumPhotos([{}, { images: null }] as any)).toBe(0);
  });

  it('detecta la pérdida que motivó la guarda anti-pérdida', () => {
    const before = [{ images: ['a', 'b', 'c'] }];
    const after = [{ images: [null, null, null] }];
    expect(countAlbumPhotos(before)).toBe(3);
    expect(countAlbumPhotos(after)).toBe(0);
  });
});

describe('countPersistedPhotos', () => {
  it('usa pages para álbumes', () => {
    expect(countPersistedPhotos({ pages: [{ images: ['a', 'b'] }], photos: [] })).toBe(2);
  });

  it('usa items para tazas', () => {
    expect(countPersistedPhotos({ items: [{ photos: ['a'] }, { photos: ['b', 'c'] }] })).toBe(3);
  });

  it('usa el array plano para calendarios y packs', () => {
    expect(countPersistedPhotos({ photos: ['a', 'b', null] })).toBe(2);
  });

  it('devuelve 0 para un documento sin fotos (p. ej. álbum personalizado)', () => {
    expect(countPersistedPhotos({ productType: 'custom-album' })).toBe(0);
  });
});

describe('assertNoLocalUrls', () => {
  it('acepta un payload solo con URLs remotas', () => {
    const payload = {
      pages: [{ images: ['https://firebasestorage.googleapis.com/x?token=1'] }],
      coverData: { image: 'https://firebasestorage.googleapis.com/cover' },
    };
    expect(() => assertNoLocalUrls(payload)).not.toThrow();
  });

  it('rechaza blob: en cualquier profundidad', () => {
    expect(() => assertNoLocalUrls({ pages: [{ images: ['blob:http://x/abc'] }] }))
      .toThrow(/URL\(s\) locales/);
  });

  it('rechaza data:image', () => {
    expect(() => assertNoLocalUrls({ coverData: { image: 'data:image/png;base64,AAA' } }))
      .toThrow(/URL\(s\) locales/);
  });

  it('informa de cuántas encontró', () => {
    expect(() => assertNoLocalUrls({ photos: ['blob:a', 'blob:b', 'https://ok'] }))
      .toThrow(/2 URL\(s\) locales/);
  });

  it('no confunde una URL de Storage con una local', () => {
    expect(() => assertNoLocalUrls({ photos: ['https://x/blob:not-really'] })).not.toThrow();
  });
});

describe('sanitizeForFirestore', () => {
  it('convierte undefined de nivel superior en null', () => {
    expect(sanitizeForFirestore(undefined)).toBeNull();
  });

  it('omite las claves con undefined', () => {
    expect(sanitizeForFirestore({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it('recorre arrays y objetos anidados', () => {
    expect(sanitizeForFirestore({ p: [{ x: undefined, y: 2 }] })).toEqual({ p: [{ y: 2 }] });
  });

  it('deja pasar null y preserva Date', () => {
    const d = new Date(0);
    expect(sanitizeForFirestore({ a: null, d })).toEqual({ a: null, d });
  });
});

describe('SCHEMA_VERSION', () => {
  it('marca los documentos escritos con photoCount', () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(2);
  });
});
