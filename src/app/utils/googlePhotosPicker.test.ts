import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseDuration, pickerUrl, createPickerSession } from './googlePhotosPicker';

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

  afterEach(() => vi.unstubAllGlobals());

  it("createPickerSession limita las fotos solo si se pide (portada = 1)", async () => {
    const bodies: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(String(init.body));
      return new Response(JSON.stringify({ id: "s", pickerUri: "u" }), { status: 200 });
    }));
    await createPickerSession("tok", 1);
    await createPickerSession("tok");
    expect(JSON.parse(bodies[0])).toEqual({ pickingConfig: { maxItemCount: "1" } });
    expect(JSON.parse(bodies[1])).toEqual({});
  });
});
