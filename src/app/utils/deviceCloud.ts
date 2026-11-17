// ============================================================================
// Nube de fotos según el dispositivo
// ============================================================================
// El selector de archivos del navegador ya da acceso a la nube del sistema
// (iCloud en iPhone, Google Fotos/OneDrive en Android), pero muchos clientes no
// lo saben. Aquí solo se decide QUÉ plataforma es, para mostrar la ayuda
// adecuada; los textos viven en appTexts ('organizer.cloudHint.*').
// ============================================================================

export type CloudPlatform = 'ios' | 'samsung' | 'android' | 'mac' | 'windows' | 'other';

/**
 * Plataforma a partir del user agent. `maxTouchPoints` distingue un iPad con
 * iPadOS 13+, que se anuncia como Mac de escritorio.
 */
export function detectCloudPlatform(userAgent: string, maxTouchPoints = 0): CloudPlatform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (ua.includes('macintosh') && maxTouchPoints > 1) return 'ios';
  if (ua.includes('android')) {
    // Samsung: el navegador Samsung Internet o un modelo SM-xxxx en el UA.
    return /samsungbrowser|\bsm-[a-z0-9]+/.test(ua) ? 'samsung' : 'android';
  }
  if (ua.includes('macintosh') || ua.includes('mac os x')) return 'mac';
  if (ua.includes('windows')) return 'windows';
  return 'other';
}

export function currentCloudPlatform(): CloudPlatform {
  if (typeof navigator === 'undefined') return 'other';
  return detectCloudPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0);
}
