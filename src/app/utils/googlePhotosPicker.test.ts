import { describe, it, expect } from 'vitest';
import { parseDuration, pickerUrl } from './googlePhotosPicker';

describe('Google Fotos picker', () => {
  it('parseDuration lee la duración de Google ("5s", "1799.5s")', () => {
    expect(parseDuration('5s', 0)).toBe(5000);
    expect(parseDuration('1799.5s', 0)).toBe(1799500);
    expect(parseDuration(undefined, 3000)).toBe(3000);
    expect(parseDuration('raro', 3000)).toBe(3000);
  });

  it('pickerUrl añade /autoclose sin duplicar la barra', () => {
    expect(pickerUrl({ id: 'a', pickerUri: 'https://photos.google.com/picker/abc' }))
      .toBe('https://photos.google.com/picker/abc/autoclose');
    expect(pickerUrl({ id: 'a', pickerUri: 'https://photos.google.com/picker/abc/' }))
      .toBe('https://photos.google.com/picker/abc/autoclose');
  });
});
