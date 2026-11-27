// ============================================================================
// LOGO DE LA CONTRAPORTADA PARA EL PDF DE IMPRESIÓN
// ============================================================================
// El PDF de portada pintaba el logo con <img src="/assets/JiffyLogo-….svg">:
// el único elemento de la página que se descargaba por red sin precarga ni
// comprobación. Si esa descarga fallaba una vez, Chrome recuerda el error en la
// pestaña y los 5 intentos acababan igual: "No se pudo generar la portada
// completa tras 5 intentos (una imagen de la página está vacía)" (pedido
// PL8ZbHMd, 27-nov-2026). Recargar la página lo "arreglaba".
//
// Ahora el SVG va dentro del bundle (?raw) y se pasa como Data URL: no hay
// petición de red que pueda fallar. Además se le fija el tamaño intrínseco
// (el archivo declara width/height="100%", sin tamaño propio), para que
// naturalWidth nunca sea 0 en ningún navegador.

import jiffyLogoSvg from '../../assets/JiffyLogo.svg?raw';

/** Sustituye width/height relativos (o ausentes) de la raíz <svg> por los del viewBox. */
export function withIntrinsicSize(svg: string): string {
  return svg.replace(/<svg\b[^>]*>/, (tag) => {
    const vb = tag.match(/viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/);
    if (!vb) return tag;
    const [, w, h] = vb;
    const stripped = tag.replace(/\s(width|height)="[^"]*"/g, '');
    return stripped.replace(/^<svg\b/, `<svg width="${w}" height="${h}"`);
  });
}

export const svgToDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Logo JIFFY. listo para incrustar en el PDF, sin depender de la red. */
export const PRINT_LOGO_DATA_URL = svgToDataUrl(withIntrinsicSize(jiffyLogoSvg));
