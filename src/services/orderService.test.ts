import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  isLegacyOrder,
  buildLoosePhotos,
  type UploadContext,
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

  it('usa el array plano para calendarios', () => {
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

describe('isLegacyOrder', () => {
  it('un pedido sin createdSchemaVersion es del sistema anterior', () => {
    expect(isLegacyOrder({ status: 'saved_draft', schemaVersion: 2 })).toBe(true);
    expect(isLegacyOrder({})).toBe(true);
    expect(isLegacyOrder(null)).toBe(true);
  });

  it('re-guardar un pedido viejo con código nuevo no borra la marca (schemaVersion sube, createdSchemaVersion no)', () => {
    expect(isLegacyOrder({ schemaVersion: SCHEMA_VERSION })).toBe(true);
  });

  it('un pedido creado con v3 o posterior no es del sistema anterior', () => {
    expect(isLegacyOrder({ createdSchemaVersion: 3 })).toBe(false);
    expect(isLegacyOrder({ createdSchemaVersion: SCHEMA_VERSION })).toBe(false);
  });
});

describe('buildLoosePhotos (calendario)', () => {
  const makeCtx = (): UploadContext => ({
    folderPath: 'orders/u1/o1',
    knownUrls: {},
    newUrls: {},
    failures: [],
    tick: vi.fn(),
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const storage = await import('firebase/storage');
    vi.mocked(storage.ref).mockImplementation((_s: any, path?: string) => ({ fullPath: path }) as any);
    vi.mocked(storage.uploadBytes).mockImplementation(async (r: any) => ({ ref: r }) as any);
    vi.mocked(storage.getDownloadURL).mockImplementation(async (r: any) => `https://storage/${r.fullPath}?token=t`);
    vi.stubGlobal('fetch', vi.fn(async () => ({ blob: async () => new Blob(['x']) })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('nunca reutiliza la ruta de Storage de un slot (sobrescribir invalidaba la URL anterior → "No se cargó")', async () => {
    const storage = await import('firebase/storage');
    const first = await buildLoosePhotos(['blob:http://x/a'], makeCtx());
    const second = await buildLoosePhotos(['blob:http://x/b'], makeCtx());
    const paths = vi.mocked(storage.ref).mock.calls.map(c => c[1]);
    expect(paths).toHaveLength(2);
    expect(paths[0]).not.toBe(paths[1]);
    expect(paths.every(p => String(p).startsWith('orders/u1/o1/loose_photos/photo0'))).toBe(true);
    expect(first[0]).not.toBe(second[0]);
  });

  it('conserva los huecos intermedios para que el índice siga siendo el mes', async () => {
    const result = await buildLoosePhotos(
      ['https://storage/x/photo0?token=1', '', 'blob:http://x/c', '', ''],
      makeCtx()
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('https://storage/x/photo0?token=1');
    expect(result[1]).toBe('');
    expect(result[2]).toMatch(/^https:\/\/storage\/orders\/u1\/o1\/loose_photos\/photo2_/);
  });

  it('no resube una URL remota ni una blob: ya conocida', async () => {
    const storage = await import('firebase/storage');
    const ctx = makeCtx();
    ctx.knownUrls['blob:http://x/known'] = 'https://storage/x/known?token=k';
    const result = await buildLoosePhotos(['https://storage/x/r?token=r', 'blob:http://x/known'], ctx);
    expect(result).toEqual(['https://storage/x/r?token=r', 'https://storage/x/known?token=k']);
    expect(storage.uploadBytes).not.toHaveBeenCalled();
  });
});
