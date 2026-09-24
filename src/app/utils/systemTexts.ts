// ============================================================================
// System Texts
// ============================================================================
// Textos de la tienda editables desde el panel de administración.
//
// Cada texto de la app tiene una clave (`landing.ourProducts`) y un valor por
// defecto en el código (LanguageContext + i18n/appTexts). La administración
// puede sustituir cualquiera: lo que cambie se guarda en `settings/system_texts`
// y `t()` lo usa en vez del texto del código. Lo que no se ha tocado sigue
// saliendo del código, así que una clave nueva funciona aunque el documento sea
// viejo, y si Firestore falla la app se ve exactamente igual que sin esta función.
//
// Las claves llevan puntos, que Firestore interpreta como rutas en algunas
// operaciones; por eso se guardan como una lista de pares {key, value} y no
// como un mapa.
// ============================================================================

export type TextLanguage = 'es' | 'en';

export const SYSTEM_TEXTS_DOC = { collection: 'settings', id: 'system_texts' } as const;

export interface SystemTextEntry {
  key: string;
  value: string;
}

export interface SystemTextsDoc {
  es?: SystemTextEntry[];
  en?: SystemTextEntry[];
}

export type TextOverrides = Record<TextLanguage, Record<string, string>>;

export const EMPTY_OVERRIDES: TextOverrides = { es: {}, en: {} };

/** Lista guardada → mapa. Descarta entradas mal formadas o vacías. */
export function entriesToMap(entries: unknown): Record<string, string> {
  const map: Record<string, string> = {};
  if (!Array.isArray(entries)) return map;
  for (const entry of entries) {
    if (
      entry && typeof entry === 'object' &&
      typeof (entry as SystemTextEntry).key === 'string' &&
      typeof (entry as SystemTextEntry).value === 'string' &&
      (entry as SystemTextEntry).value.trim() !== ''
    ) {
      map[(entry as SystemTextEntry).key] = (entry as SystemTextEntry).value;
    }
  }
  return map;
}

/** Mapa → lista para guardar, ordenada por clave para que los diffs sean estables. */
export function mapToEntries(map: Record<string, string>): SystemTextEntry[] {
  return Object.keys(map)
    .sort()
    .map(key => ({ key, value: map[key] }));
}

export function parseSystemTextsDoc(data: SystemTextsDoc | undefined | null): TextOverrides {
  return { es: entriesToMap(data?.es), en: entriesToMap(data?.en) };
}

/**
 * Texto final de una clave: lo que haya puesto la administración en ese idioma,
 * si no el del código en ese idioma y, si la clave solo existe en español (los
 * textos nuevos se escriben solo en español), el español.
 */
export function resolveText(
  key: string,
  language: TextLanguage,
  overrides: TextOverrides,
  defaults: Record<TextLanguage, Record<string, string>>
): string | undefined {
  return (
    overrides[language][key] ??
    defaults[language][key] ??
    overrides.es[key] ??
    defaults.es[key]
  );
}

/** Sustituye TODAS las apariciones de cada `{param}`. */
export function interpolate(value: string, params?: Record<string, string | number>): string {
  if (!params) return value;
  let out = value;
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

/** Variables `{nombre}` que usa un texto, sin repetir y en orden de aparición. */
export function placeholdersOf(value: string): string[] {
  const found: string[] = [];
  for (const m of value.matchAll(/\{(\w+)\}/g)) {
    if (!found.includes(m[1])) found.push(m[1]);
  }
  return found;
}

/**
 * Problemas de un texto editado frente al original. Las variables tienen que
 * seguir todas (la app las rellena: si se pierde `{count}`, el número no sale)
 * y no se pueden inventar nuevas (saldrían tal cual, con llaves).
 */
export function validateEditedText(original: string, edited: string): string[] {
  const problems: string[] = [];
  if (edited.trim() === '') problems.push('El texto no puede quedar vacío.');
  const expected = placeholdersOf(original);
  const got = placeholdersOf(edited);
  const missing = expected.filter(p => !got.includes(p));
  const unknown = got.filter(p => !expected.includes(p));
  if (missing.length) problems.push(`Falta ${missing.map(p => `{${p}}`).join(', ')}: la app lo rellena con un dato real.`);
  if (unknown.length) problems.push(`${unknown.map(p => `{${p}}`).join(', ')} no existe para este texto y saldría tal cual.`);
  return problems;
}
