/**
 * Límite de caracteres por campo de portada, para que título / subtítulo / lomo
 * SIEMPRE rendericen en una sola línea — tanto en el preview como en el PDF de
 * impresión a 300 DPI (ambos usan el mismo `CoverPreview`).
 *
 * La clave que convierte esto en una tabla y no en veinte números mágicos:
 * todos los tamaños de fuente de la portada están en `cqw` contra un ancestro
 * con `containerType: 'inline-size'`. Si el ancho disponible se expresa como
 * porcentaje DEL MISMO contenedor, las unidades físicas se cancelan y el límite
 * es un número puro, válido igual en el preview de 240px que en el export de
 * 2480px:
 *
 *   maxChars  = floor( usableWidthPct × SAFETY / (advanceEm × fontCqw) )
 *   advanceEm = AVG_CHAR_EM + weightDelta + trackingEm
 *
 * Toda la geometría está copiada literalmente de CoverPreview.tsx, con el
 * número de línea al lado. Si ese archivo cambia, esta tabla debe cambiar.
 */

export type CoverSize = '20x20' | '30x30' | '21x28' | '28x21';
export type CoverType = 'Tela' | 'Papel';

export interface CoverTextLimits {
  /** null = este layout no renderiza título. */
  title: number | null;
  /** null = este layout no renderiza subtítulo. */
  subtitle: number | null;
  /** Siempre presente; sólo aplica a Papel (Tela no lleva lomo). */
  spine: number;
}

interface FieldGeometry {
  /**
   * Espacio horizontal que puede ocupar el texto, como porcentaje del ancestro
   * `container-type: inline-size` más cercano. Comparte denominador con
   * `fontCqw` — ojo con CUADRADO L3, cuyo contenedor es el recuadro con inset.
   * En los layouts donde título y subtítulo comparten una fila
   * `flex justify-between`, este valor YA viene partido a la mitad.
   */
  usableWidthPct: number;
  /** font-size en cqw, copiado tal cual de CoverPreview.tsx. */
  fontCqw: number;
  /** 'bold' cubre font-bold y font-black. */
  weight: 'regular' | 'bold';
  /** tracking-* de Tailwind en em. Es ancho real y se suma por carácter. */
  trackingEm: number;
}

type LayoutGeometry = { title: FieldGeometry | null; subtitle: FieldGeometry | null };
type Family = 'tela' | 'vertical' | 'horizontal' | 'square20' | 'square30';

/**
 * Avance medio por glifo en mayúsculas (caso peor: el default de la app es
 * 'NUESTRA HISTORIA'), pesado por frecuencia del español y medido contra
 * Century Gothic — la más ancha del stack `Avenir, 'Century Gothic',
 * 'Gill Sans', sans-serif` (CoverPreview.tsx:510) y la que resuelve en las
 * máquinas Windows que generan los PDFs (src/styles/fonts.css está vacío: no
 * hay @font-face, la fuente sale del SO).
 *
 * Si los límites resultan demasiado estrictos, ESTE es el único dial a mover
 * (0.56 modela Title Case y da ~9% más caracteres). No subir SAFETY de 0.98.
 */
const AVG_CHAR_EM = 0.61;
const WEIGHT_DELTA_EM = { regular: 0, bold: 0.03 } as const;
/** Valores de tracking-* de Tailwind v4, por legibilidad en la tabla. */
const TRACK = { tight: -0.025, none: 0, wide: 0.025, widest: 0.1 } as const;
/** Aire para bordes de 1px, hinting y redondeo a zoom bajo. */
const SAFETY = 0.95;

const advanceEm = (g: FieldGeometry) => AVG_CHAR_EM + WEIGHT_DELTA_EM[g.weight] + g.trackingEm;

const charsFor = (g: FieldGeometry | null): number | null =>
  g === null ? null : Math.max(1, Math.floor((g.usableWidthPct * SAFETY) / (advanceEm(g) * g.fontCqw)));

const GEOMETRY: Record<Family, Record<number, LayoutGeometry>> = {
  // ── TELA — 3 layouts, idénticos en los 4 tamaños (geometría cqw pura)
  tela: {
    // L1 CoverPreview.tsx:102-113 — h2/p `absolute w-full text-center`
    1: {
      title:    { usableWidthPct: 100,   fontCqw: 4,    weight: 'bold',    trackingEm: TRACK.none },
      subtitle: { usableWidthPct: 100,   fontCqw: 2.4,  weight: 'regular', trackingEm: TRACK.widest },
    },
    // L2 :116-127 — el subtítulo es abspos `right:20%` sin left → cabe en 80cqw
    2: {
      title:    { usableWidthPct: 100,   fontCqw: 3.2,  weight: 'bold',    trackingEm: TRACK.none },
      subtitle: { usableWidthPct:  80,   fontCqw: 3.2,  weight: 'regular', trackingEm: TRACK.none },
    },
    // L3 :130-141 — wrapper `p-[10cqw]` → 100 − 2×10
    3: {
      title:    { usableWidthPct:  80,   fontCqw: 6.4,  weight: 'bold',    trackingEm: TRACK.none },
      subtitle: { usableWidthPct:  80,   fontCqw: 4,    weight: 'regular', trackingEm: TRACK.none },
    },
  },

  // ── VERTICAL '28x21' (21cm ancho × 28cm alto) — Papel, 4 layouts
  vertical: {
    // L1 :161 — abspos left:3.33% sin right → 100 − 3.33. Sin subtítulo.
    1: {
      title:    { usableWidthPct: 96.67, fontCqw: 5,    weight: 'bold',    trackingEm: TRACK.none },
      subtitle: null,
    },
    // L2 :184-187 — fila justify-between: 100/2 = 50, menos su px-[2%] (2×2)
    2: {
      title:    { usableWidthPct:  46,   fontCqw: 3.36, weight: 'bold',    trackingEm: TRACK.none },
      subtitle: { usableWidthPct:  46,   fontCqw: 3.36, weight: 'regular', trackingEm: TRACK.none },
    },
    // L3 :201-215 — cq = `absolute inset-0` (ancho completo).
    //   caja (100 − 2×25.71) = 48.58 → inner ×(1 − 2×0.0392) = 44.77
    3: {
      title:    { usableWidthPct: 44.77, fontCqw: 3.04, weight: 'bold',    trackingEm: TRACK.tight },
      subtitle: { usableWidthPct: 44.77, fontCqw: 3.04, weight: 'regular', trackingEm: TRACK.widest },
    },
    // L4 :227-237 — h2 `w-full px-[2%]` → 96; footer p `px-[2%]` → 96
    4: {
      title:    { usableWidthPct:  96,   fontCqw: 3.87, weight: 'bold',    trackingEm: TRACK.none },
      subtitle: { usableWidthPct:  96,   fontCqw: 3.36, weight: 'regular', trackingEm: TRACK.none },
    },
  },

  // ── HORIZONTAL '21x28' (28cm ancho × 21cm alto) — Papel, 5 layouts
  horizontal: {
    // L1 :260-263 — `absolute w-full flex flex-col items-center`, sin padding
    1: {
      title:    { usableWidthPct: 100,   fontCqw: 3.30, weight: 'bold',    trackingEm: TRACK.none },
      subtitle: { usableWidthPct: 100,   fontCqw: 2.12, weight: 'regular', trackingEm: TRACK.none },
    },
    // L2 :288-291 — fila con padding 7.14% a cada lado → 85.72, mitad = 42.86
    2: {
      title:    { usableWidthPct: 42.86, fontCqw: 2.52, weight: 'bold',    trackingEm: TRACK.none },
      subtitle: { usableWidthPct: 42.86, fontCqw: 2.52, weight: 'regular', trackingEm: TRACK.none },
    },
    // L3 :305-319 — caja (100 − 2×30.71) = 38.58 → ×(1 − 2×0.0370) = 35.72
    3: {
      title:    { usableWidthPct: 35.72, fontCqw: 2.17, weight: 'bold',    trackingEm: TRACK.tight },
      subtitle: { usableWidthPct: 35.72, fontCqw: 2.17, weight: 'regular', trackingEm: TRACK.widest },
    },
    // L4 :330-339 — paddingLeft/Right 6.07% → 93.93
    4: {
      title:    { usableWidthPct: 93.93, fontCqw: 2.52, weight: 'bold',    trackingEm: TRACK.none },
      subtitle: { usableWidthPct: 93.93, fontCqw: 2.52, weight: 'regular', trackingEm: TRACK.none },
    },
    // L5 :345-352 — full bleed, sin texto
    5: { title: null, subtitle: null },
  },

  // ── CUADRADO 20×20 — Papel, 5 layouts
  square20: {
    // L1 :384-388 — columna centrada a ancho completo; título tracking-wide,
    //   subtítulo tracking-widest
    1: {
      title:    { usableWidthPct: 100,   fontCqw: 5,    weight: 'bold',    trackingEm: TRACK.wide },
      subtitle: { usableWidthPct: 100,   fontCqw: 3.8,  weight: 'regular', trackingEm: TRACK.widest },
    },
    // L2 :416-419 — fila con padding 5.5% a cada lado → 89, mitad = 44.5
    2: {
      title:    { usableWidthPct: 44.5,  fontCqw: 2.82, weight: 'bold',    trackingEm: TRACK.none },
      subtitle: { usableWidthPct: 44.5,  fontCqw: 2.82, weight: 'regular', trackingEm: TRACK.none },
    },
    // L3 :444-457 — ¡OJO! el cq aquí es el recuadro con imgInset (18cm), NO la
    //   portada. caja (100 − 2×21.11) = 57.78 → ×(1 − 2×0.0385) = 53.33,
    //   porcentajes DEL INSET. Coincide con el comentario "18cm ref" de :427.
    3: {
      title:    { usableWidthPct: 53.33, fontCqw: 3.49, weight: 'bold',    trackingEm: TRACK.tight },
      subtitle: { usableWidthPct: 53.33, fontCqw: 3.49, weight: 'regular', trackingEm: TRACK.widest },
    },
    // L4 :476-486 — paddingLeft/Right 5% → 95
    4: {
      title:    { usableWidthPct:  95,   fontCqw: 2.86, weight: 'bold',    trackingEm: TRACK.none },
      subtitle: { usableWidthPct:  95,   fontCqw: 2.86, weight: 'regular', trackingEm: TRACK.none },
    },
    5: { title: null, subtitle: null },
  },

  // ── CUADRADO 30×30 — Papel, 5 layouts
  square30: {
    1: {
      title:    { usableWidthPct: 100,   fontCqw: 5.2,  weight: 'bold',    trackingEm: TRACK.wide },
      subtitle: { usableWidthPct: 100,   fontCqw: 4.1,  weight: 'regular', trackingEm: TRACK.widest },
    },
    // fila con padding 6.67% a cada lado → 86.66, mitad = 43.33
    2: {
      title:    { usableWidthPct: 43.33, fontCqw: 2.35, weight: 'bold',    trackingEm: TRACK.none },
      subtitle: { usableWidthPct: 43.33, fontCqw: 2.35, weight: 'regular', trackingEm: TRACK.none },
    },
    // cq = imgInset (26cm, ver "26cm ref" en :428).
    //   caja (100 − 2×23.08) = 53.84 → ×(1 − 2×0.0286) = 50.76
    3: {
      title:    { usableWidthPct: 50.76, fontCqw: 3.08, weight: 'bold',    trackingEm: TRACK.tight },
      subtitle: { usableWidthPct: 50.76, fontCqw: 3.08, weight: 'regular', trackingEm: TRACK.widest },
    },
    // paddingLeft/Right 6.67% → 93.33
    4: {
      title:    { usableWidthPct: 93.33, fontCqw: 2.59, weight: 'bold',    trackingEm: TRACK.none },
      subtitle: { usableWidthPct: 93.33, fontCqw: 2.59, weight: 'regular', trackingEm: TRACK.none },
    },
    5: { title: null, subtitle: null },
  },
};

/**
 * ALTO del álbum en cm — el texto del lomo corre a lo largo de él.
 * Ojo con la nomenclatura del proyecto: '21x28' es la portada HORIZONTAL
 * (28cm ancho × 21cm alto) y '28x21' la VERTICAL (21 × 28).
 */
const ALBUM_HEIGHT_CM: Record<CoverSize, number> = {
  '20x20': 20,
  '30x30': 30,
  '21x28': 21,
  '28x21': 28,
};

/**
 * El lomo tiene DOS implementaciones distintas y hay que respetar la más
 * estrecha:
 *  - preview  CoverPreview.tsx:513-532 — lomo de 1cm, fuente 38.81cqw de ese
 *    ancho (= 0.3881cm = 11pt), tracking-widest, texto desde 1.5cm del tope.
 *  - PDF      OwnerDashboard.tsx:822-837 — dibuja su PROPIO lomo: spineCm = 2,
 *    fuente = spinePxWidth × 0.25 (≈ 0.4996cm), letterSpacing '8px' (= 0.0677cm
 *    a 300 DPI) y el texto arranca al 10% del alto.
 * En los 4 tamaños manda el PDF.
 */
const PREVIEW_SPINE = { fontCm: 0.3881, topOffsetCm: 1.5, extraTrackingCm: 0.3881 * 0.1 };
const PDF_SPINE = { fontCm: 0.4996, topOffsetFrac: 0.1, extraTrackingCm: (8 / 300) * 2.54 };

function spineLimit(size: CoverSize): number {
  const h = ALBUM_HEIGHT_CM[size];
  const boldEm = AVG_CHAR_EM + WEIGHT_DELTA_EM.bold;

  const previewAdv = boldEm * PREVIEW_SPINE.fontCm + PREVIEW_SPINE.extraTrackingCm;
  const previewMax = Math.floor(((h - PREVIEW_SPINE.topOffsetCm) * SAFETY) / previewAdv);

  const pdfAdv = boldEm * PDF_SPINE.fontCm + PDF_SPINE.extraTrackingCm;
  const pdfMax = Math.floor((h * (1 - PDF_SPINE.topOffsetFrac) * SAFETY) / pdfAdv);

  return Math.max(1, Math.min(previewMax, pdfMax));
}

function familyFor(size: CoverSize, type: CoverType): Family {
  if (type === 'Tela') return 'tela';
  if (size === '28x21') return 'vertical';
  if (size === '21x28') return 'horizontal';
  return size === '30x30' ? 'square30' : 'square20';
}

/**
 * Máximo de caracteres por campo para que el texto quepa en una sola línea.
 *
 * Tabla resultante (título / subtítulo):
 *
 *   Familia            L1        L2        L3        L4        L5        Lomo
 *   Tela (4 tamaños)   37 / 55   46 / 38   18 / 31   —         —         n/a
 *   Vertical 28x21     28 / —    20 / 21   22 / 19   36 / 44   —         61
 *   Horizontal 21x28   44 / 73   25 / 26   25 / 22   55 / 58   sin texto 46
 *   Cuadrado 20x20     28 / 35   23 / 24   23 / 20   49 / 51   sin texto 44
 *   Cuadrado 30x30     27 / 32   27 / 28   25 / 22   53 / 56   sin texto 66
 */
export function getCoverTextLimits(
  coverSize: CoverSize,
  coverType: CoverType,
  selectedLayout: number,
): CoverTextLimits {
  const table = GEOMETRY[familyFor(coverSize, coverType)];
  // Layout fuera de rango: CoverEditor.tsx:129-133 lo resetea a 1 en el
  // siguiente tick, así que replicamos eso en vez de lanzar durante el render
  // transitorio.
  const geo = table[selectedLayout] ?? table[1];
  return {
    title: charsFor(geo.title),
    subtitle: charsFor(geo.subtitle),
    spine: spineLimit(coverSize),
  };
}
