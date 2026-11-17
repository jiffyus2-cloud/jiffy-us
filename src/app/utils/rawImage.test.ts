import { describe, it, expect } from 'vitest';
import { isRawFile, findEmbeddedJpegs, readRawOrientation, readTiffOrientation } from './rawImage';

const seg = (marker: number, payload: number[]) => [0xff, marker, ((payload.length + 2) >> 8) & 0xff, (payload.length + 2) & 0xff, ...payload];
const sof = (marker: number, w: number, h: number) => seg(marker, [8, h >> 8, h & 0xff, w >> 8, w & 0xff, 1, 1, 0x11, 0]);
/** TIFF "II" mínimo con IFD0 = { Orientation: o }. */
const tiff = (o: number) => [0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, o, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const jpeg = (marker: number, w: number, h: number, extra: number[] = []) => [
  0xff, 0xd8, ...extra, ...sof(marker, w, h), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]),
  0x12, 0xff, 0x00, 0x34, 0xff, 0xd3, 0x56, // datos con relleno FF00 y un RST
  0xff, 0xd9,
];

describe('isRawFile', () => {
  it('reconoce extensiones y tipos MIME de RAW', () => {
    expect(isRawFile({ name: 'IMG_0001.CR3', type: '' })).toBe(true);
    expect(isRawFile({ name: 'foto.dng', type: '' })).toBe(true);
    expect(isRawFile({ name: 'x', type: 'image/x-nikon-nef' })).toBe(true);
    expect(isRawFile({ name: 'foto.jpg', type: 'image/jpeg' })).toBe(false);
    expect(isRawFile({ name: 'foto.heic', type: 'image/heic' })).toBe(false);
  });
});

describe('findEmbeddedJpegs', () => {
  it('elige la vista previa grande, ignora el sensor "lossless" y la miniatura EXIF anidada', () => {
    const thumb = jpeg(0xc0, 160, 120);
    const exifApp1 = seg(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff(1), ...thumb]);
    const bytes = new Uint8Array([
      ...tiff(6),
      ...new Array(50).fill(0xab),
      ...jpeg(0xc3, 6000, 4000),          // datos del sensor (lossless): no decodificable
      ...new Array(20).fill(0),
      ...jpeg(0xc0, 1616, 1080),          // vista previa mediana
      ...new Array(20).fill(0),
      ...jpeg(0xc0, 6000, 4000, exifApp1), // vista previa a tamaño completo
    ]);
    const found = findEmbeddedJpegs(bytes);
    expect(found.map(j => `${j.width}x${j.height}`)).toEqual(['6000x4000', '1616x1080']);
    expect(found[0].orientation).toBe(1);
    // La JPEG elegida empieza y termina donde debe.
    expect([bytes[found[0].start], bytes[found[0].start + 1]]).toEqual([0xff, 0xd8]);
    expect([bytes[found[0].end - 2], bytes[found[0].end - 1]]).toEqual([0xff, 0xd9]);
  });

  it('no encuentra nada en un archivo sin JPEG', () => {
    expect(findEmbeddedJpegs(new Uint8Array([...tiff(1), 1, 2, 3, 0xff, 0xd8, 0x00]))).toEqual([]);
  });
});

describe('orientación', () => {
  it('lee la orientación del IFD0 (II y MM)', () => {
    expect(readTiffOrientation(new Uint8Array(tiff(8)), 0)).toBe(8);
    const mm = [0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0];
    expect(readTiffOrientation(new Uint8Array(mm), 0)).toBe(6);
  });

  it('CR3: la busca en la caja CMT1', () => {
    const bytes = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, ...new Array(16).fill(0), 0, 0, 0, 36, 0x43, 0x4d, 0x54, 0x31, ...tiff(3)]);
    expect(readRawOrientation(bytes)).toBe(3);
  });
});
