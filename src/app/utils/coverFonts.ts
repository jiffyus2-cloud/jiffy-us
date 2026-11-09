// ============================================================================
// Cover Fonts
// ============================================================================
// Fuentes web de la carátula de Papel (las carga index.html desde Google
// Fonts). El PDF de impresión las tiene que tener cargadas antes de capturar y
// pasarlas incrustadas a html-to-image (ver getCalendarFontEmbedCSS), porque
// html-to-image no puede leer la hoja de otro origen.
// ============================================================================

/**
 * Título y subtítulo del layout 1 cuadrado 20x20 (referencia del taller).
 * La referencia usa "Nunito Sans 10pt", el tamaño óptico de 10pt, un 5% más
 * ancho que el de 12pt que Google sirve por defecto; por eso index.html pide
 * `opsz` 10 para la redonda (la cursiva del calendario sigue en 12).
 */
export const COVER_SANS_FONT_FAMILY = "'Nunito Sans', sans-serif";
/**
 * Google sirve un archivo variable: sin fijar el eje, el navegador aplica el
 * tamaño óptico automático (12pt a estos tamaños) y el texto sale más estrecho.
 */
export const COVER_SANS_FONT_VARIATION = "'opsz' 10";

/** Caras que hay que tener cargadas antes de capturar la carátula. */
export const COVER_FONT_FACES = [
  '400 16px "Nunito Sans"', '700 16px "Nunito Sans"', // portada (layout 1 20x20)
  '700 16px "Open Sans"',                              // lomo (albumSpine.ts)
];

export const loadCoverFonts = async () => {
  try {
    await Promise.all(COVER_FONT_FACES.map(f => document.fonts.load(f)));
  } catch { /* sin fuentes web se usa el respaldo; no debe frenar la impresión */ }
};
