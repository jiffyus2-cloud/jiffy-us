import { describe, it, expect } from 'vitest';
import { detectCloudPlatform } from './deviceCloud';

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  ipadOs: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  samsungBrowser: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  samsungChrome: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  pixel: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  // Chrome reducido: el modelo se oculta como "K".
  androidReduced: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
};

describe('detectCloudPlatform', () => {
  it('iPhone e iPad (también iPadOS que se anuncia como Mac) son iOS', () => {
    expect(detectCloudPlatform(UA.iphone)).toBe('ios');
    expect(detectCloudPlatform(UA.ipadOs, 5)).toBe('ios');
  });

  it('un Mac sin pantalla táctil es Mac', () => {
    expect(detectCloudPlatform(UA.ipadOs, 0)).toBe('mac');
  });

  it('Samsung se reconoce por su navegador o por el modelo SM-', () => {
    expect(detectCloudPlatform(UA.samsungBrowser)).toBe('samsung');
    expect(detectCloudPlatform(UA.samsungChrome)).toBe('samsung');
  });

  it('otro Android, o uno sin modelo visible, es Android genérico', () => {
    expect(detectCloudPlatform(UA.pixel)).toBe('android');
    expect(detectCloudPlatform(UA.androidReduced)).toBe('android');
  });

  it('escritorio', () => {
    expect(detectCloudPlatform(UA.windows)).toBe('windows');
    expect(detectCloudPlatform(UA.linux)).toBe('other');
  });
});
