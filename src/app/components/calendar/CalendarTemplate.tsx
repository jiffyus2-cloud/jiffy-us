/**
 * Plantillas de impresión de los calendarios 2027 (Escritorio y Pared).
 *
 * Copian los PDF de referencia de producción ("Calendario de Escritorio 2027 -
 * Margen" y "Calendario de Pared 2027 (30 x 22 cm) - margen"). Todas las medidas
 * están en PUNTOS de esos PDF: cada página es un `viewBox` SVG con el tamaño de la
 * plantilla, así que la misma página sirve igual para el PDF a 300 DPI del panel
 * del dueño, para el editor del cliente y para el detalle del pedido (solo cambia
 * el ancho del contenedor).
 *
 * Las fotos NO se dibujan aquí: cada consumidor pasa `renderPhoto`, porque la
 * impresión necesita `CanvasCropper` (html-to-image no captura bien el
 * `ImageCropper` de pantalla) y el editor necesita sus botones encima.
 *
 * Escritorio (12,5 x 17,5 cm, vertical) — 14 páginas:
 *   portada · 12 meses (foto + número grande + cuadrícula) · los 2 meses
 *   siguientes con año + NOTAS.
 * Pared (30 x 22 cm, horizontal) — 25 páginas:
 *   portada · por cada mes, la página de foto (impresa girada 180°, porque al
 *   colgarlo queda arriba, en el reverso de la hoja anterior) y la de cuadrícula.
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { DEFAULT_HOLIDAY_COUNTRY, getColombianHolidays, getHolidaysForCountry, isHoliday, type Holiday } from '../../utils/holidays';

export type CalendarType = 'desk' | 'wall';

export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/** Tamaño físico (impresión) y tamaño de la plantilla en puntos (viewBox). */
export const CALENDAR_SPECS: Record<CalendarType, { wCm: number; hCm: number; wPt: number; hPt: number }> = {
  desk: { wCm: 12.5, hCm: 17.5, wPt: 354, hPt: 495.75 },
  wall: { wCm: 30, hCm: 22, wPt: 850.5, hPt: 623.25 },
};

export const normalizeCalendarType = (type: unknown): CalendarType => (type === 'wall' ? 'wall' : 'desk');

export interface CalendarMonth {
  monthIndex: number; // 0-11
  year: number;
  name: string;
}

/** Meses del calendario a partir del mes de inicio (1-12). `count` > 12 para la hoja final del escritorio. */
export const getCalendarMonths = (startMonth: number, startYear: number, count = 12): CalendarMonth[] =>
  Array.from({ length: count }, (_, i) => {
    const monthIndex = (startMonth - 1 + i) % 12;
    const year = startYear + Math.floor((startMonth - 1 + i) / 12);
    return { monthIndex, year, name: MONTHS_ES[monthIndex] };
  });

/** Semanas del mes empezando en lunes, como en las plantillas. */
export const getMonthWeeks = (year: number, monthIndex: number): (number | null)[][] => {
  const firstDow = (new Date(year, monthIndex, 1).getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

// ----------------------------------------------------------------------------
// Páginas y huecos de foto
// ----------------------------------------------------------------------------

export type CalendarPageSpec =
  | { kind: 'cover' }
  | { kind: 'month'; position: number }      // escritorio: foto + mes
  | { kind: 'notes' }                        // escritorio: 2 meses siguientes + notas
  | { kind: 'photo'; position: number }      // pared: hoja de la foto
  | { kind: 'grid'; position: number };      // pared: hoja del mes

/** Orden de impresión de las páginas, igual que en los PDF de referencia. */
export const getCalendarPrintPages = (type: CalendarType): CalendarPageSpec[] => {
  const pages: CalendarPageSpec[] = [{ kind: 'cover' }];
  for (let position = 0; position < 12; position++) {
    if (type === 'desk') pages.push({ kind: 'month', position });
    else pages.push({ kind: 'photo', position }, { kind: 'grid', position });
  }
  if (type === 'desk') pages.push({ kind: 'notes' });
  return pages;
};

interface Box { x: number; y: number; w: number; h: number }

const DESK_PHOTO: Box = { x: 16, y: 26, w: 322, h: 316 };
const WALL_PHOTO: Box = { x: 0, y: 30.7, w: 850.5, h: 561.8 };
// Pared x4 ("Calendario de Pared 2027 x4 fotos"): cuadrícula 2x2 a todo el ancho,
// un poco más alta que la foto única y con 19,75 pt entre fotos.
const WALL_COLLAGE: Box = { x: 0, y: 27.88, w: 850.5, h: 567.5 };
const WALL_COLLAGE_GAP = 19.75;

/** Huecos de foto de una página de mes, en puntos de la plantilla. */
export const getPhotoBoxes = (type: CalendarType, imagesPerMonth: number): Box[] => {
  if (type === 'desk') return [DESK_PHOTO];
  if (imagesPerMonth !== 4) return [WALL_PHOTO];
  const w = (WALL_COLLAGE.w - WALL_COLLAGE_GAP) / 2;
  const h = (WALL_COLLAGE.h - WALL_COLLAGE_GAP) / 2;
  return [0, 1, 2, 3].map(i => ({
    x: WALL_COLLAGE.x + (i % 2) * (w + WALL_COLLAGE_GAP),
    y: WALL_COLLAGE.y + Math.floor(i / 2) * (h + WALL_COLLAGE_GAP),
    w,
    h,
  }));
};

/**
 * Foto y recorte de un hueco en un pedido/borrador guardado. El editor guarda las
 * fotos en un arreglo PLANO (`photos[position * imagesPerMonth + slot]`) con los
 * recortes por ese mismo índice; `pages[i].images` y las claves `"mes-slot"` son
 * formatos antiguos que se siguen leyendo.
 */
export const getCalendarSlotPhoto = (
  order: { photos?: any[]; photoCrops?: Record<string, any>; pages?: any[] },
  position: number,
  slot: number,
  imagesPerMonth: number,
): { src: string; crop?: { x: number; y: number; zoom: number } } => {
  const legacyPage = order.pages?.[position];
  const legacyImages: any[] | undefined = Array.isArray(legacyPage?.images)
    ? legacyPage.images
    : legacyPage?.image ? [legacyPage.image] : undefined;
  const flatIndex = position * imagesPerMonth + slot;
  const flat = order.photos?.[flatIndex];
  const src = legacyImages ? legacyImages[slot] : Array.isArray(flat) ? flat[0] : flat;
  const crop = legacyImages
    ? order.photoCrops?.[`${position}-${slot}`] ?? (slot === 0 ? order.photoCrops?.[position] : undefined)
    : order.photoCrops?.[flatIndex] ?? order.photoCrops?.[`${position}-${slot}`];
  return { src: typeof src === 'string' ? src : '', crop };
};

/** Relación de aspecto (ancho/alto) de cada hueco, para el modal de recorte. */
export const getPhotoAspect = (type: CalendarType, imagesPerMonth: number): number => {
  const box = getPhotoBoxes(type, imagesPerMonth)[0];
  return box.w / box.h;
};

// ----------------------------------------------------------------------------
// Tipografías y colores de las plantillas
// ----------------------------------------------------------------------------

const FONT = {
  number: "'Anton', 'Arial Narrow', sans-serif",
  label: "'Montserrat', sans-serif",
  desk: "'Nunito', sans-serif",
  wall: "'Open Sans', 'Myriad Pro', sans-serif",
};

/** Fuentes que hay que tener cargadas antes de capturar una página (ver index.html). */
export const CALENDAR_FONT_FACES = [
  '400 16px Anton', '300 16px Montserrat', '400 16px Montserrat', '600 16px Montserrat',
  '500 16px Nunito', '700 16px Nunito', '400 16px "Open Sans"', '700 16px "Open Sans"',
];

export const loadCalendarFonts = async () => {
  try {
    await Promise.all(CALENDAR_FONT_FACES.map(f => document.fonts.load(f)));
  } catch { /* sin fuentes web se usa el respaldo; no debe frenar la impresión */ }
};

/** La misma hoja de estilos que carga index.html. */
const CALENDAR_FONTS_CSS_URL = 'https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@300;400;600&family=Nunito:wght@400;500;700&family=Open+Sans:wght@400;700&display=swap';

const blobToDataURL = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

let fontEmbedCssPromise: Promise<string> | null = null;

/**
 * CSS `@font-face` con las fuentes incrustadas como data URL, para el
 * `fontEmbedCSS` de html-to-image. html-to-image no puede leer la hoja de Google
 * Fonts (es de otro origen) y devuelve el CSS vacío: la captura salía con la
 * fuente de respaldo. Solo el subconjunto `latin` (incluye tildes y ñ).
 */
export const getCalendarFontEmbedCSS = (): Promise<string> => {
  fontEmbedCssPromise ??= (async () => {
    try {
      const css = await (await fetch(CALENDAR_FONTS_CSS_URL)).text();
      const latinBlocks = css.split(/(?=\/\*\s*[\w-]+\s*\*\/)/).filter(b => /^\/\*\s*latin\s*\*\//.test(b));
      const inlined = await Promise.all(latinBlocks.map(async block => {
        const url = block.match(/url\((https:[^)]+)\)/)?.[1];
        if (!url) return block;
        const dataUrl = await blobToDataURL(await (await fetch(url)).blob());
        return block.replace(url, dataUrl);
      }));
      return inlined.join('\n');
    } catch {
      fontEmbedCssPromise = null; // reintentar en la próxima impresión
      return '';
    }
  })();
  return fontEmbedCssPromise;
};

const COLOR = {
  frame: '#9C9B9B',
  coverText: '#555555',
  deskText: '#1F1F1F',
  deskNumber: '#121212',
  deskRed: '#D10D36',
  notes: '#87908D',
  notesLine: '#CDC8C8',
  wallGray: '#9C9B9B',
  wallLine: '#A8A8A8',
  wallText: '#222221',
  wallRed: '#FF3131',
};

// ----------------------------------------------------------------------------
// Piezas comunes
// ----------------------------------------------------------------------------

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

type RenderPhoto = (slot: number) => ReactNode;

/** Contenedor de página: ocupa el ancho disponible con la proporción de la plantilla. */
function PageFrame({ type, children, style }: { type: CalendarType; children: ReactNode; style?: CSSProperties }) {
  const { wPt, hPt } = CALENDAR_SPECS[type];
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: `${wPt} / ${hPt}`, backgroundColor: 'white', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

/** Capa SVG (texto y líneas) con el sistema de coordenadas de la plantilla. */
function Overlay({ type, children }: { type: CalendarType; children: ReactNode }) {
  const { wPt, hPt } = CALENDAR_SPECS[type];
  return (
    <svg
      viewBox={`0 0 ${wPt} ${hPt}`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
    >
      {children}
    </svg>
  );
}

function PhotoSlots({ type, imagesPerMonth, renderPhoto }: { type: CalendarType; imagesPerMonth: number; renderPhoto?: RenderPhoto }) {
  const { wPt, hPt } = CALENDAR_SPECS[type];
  return (
    <>
      {getPhotoBoxes(type, imagesPerMonth).map((box, slot) => (
        <div
          key={slot}
          style={{
            position: 'absolute', overflow: 'hidden', backgroundColor: '#f3f4f6',
            left: pct(box.x, wPt), top: pct(box.y, hPt), width: pct(box.w, wPt), height: pct(box.h, hPt),
          }}
        >
          {renderPhoto?.(slot)}
        </div>
      ))}
    </>
  );
}

/** Marco fino de la portada con el logo en la esquina inferior derecha, cortando las líneas. */
function CoverFrame({ type, logoSrc }: { type: CalendarType; logoSrc?: string }) {
  const { wPt, hPt } = CALENDAR_SPECS[type];
  const f = type === 'desk'
    ? { x0: 20, y0: 37.3, x1: 334, y1: 458.7, logo: { x: 287, y: 453.5, w: 44, h: 13 }, rightEnd: 458.7, bottomEnd: 281 }
    : { x0: 46.7, y0: 48.7, x1: 803.3, y1: 572.7, logo: { x: 700, y: 552, w: 102, h: 30 }, rightEnd: 555, bottomEnd: 693 };
  const line = { stroke: COLOR.frame, strokeWidth: 0.75 };
  return (
    <>
      <Overlay type={type}>
        <line x1={f.x0} y1={f.y0} x2={f.x1} y2={f.y0} {...line} />
        <line x1={f.x0} y1={f.y0} x2={f.x0} y2={f.y1} {...line} />
        <line x1={f.x1} y1={f.y0} x2={f.x1} y2={f.rightEnd} {...line} />
        <line x1={f.x0} y1={f.y1} x2={f.bottomEnd} y2={f.y1} {...line} />
      </Overlay>
      {logoSrc && (
        <img
          src={logoSrc}
          alt="Jiffy"
          style={{
            position: 'absolute', objectFit: 'contain',
            left: pct(f.logo.x, wPt), top: pct(f.logo.y, hPt), width: pct(f.logo.w, wPt), height: pct(f.logo.h, hPt),
          }}
        />
      )}
    </>
  );
}

/** Festivo (si lo hay) de un día del calendario. */
type HolidayLookup = (year: number, monthIndex: number, day: number) => Holiday | undefined;

/** Sin lista explícita se marcan los festivos de Colombia (el país por defecto). */
const colombianCache = new Map<number, Holiday[]>();
const colombianLookup: HolidayLookup = (year, monthIndex, day) => {
  if (!colombianCache.has(year)) colombianCache.set(year, getColombianHolidays(year));
  return isHoliday(new Date(year, monthIndex, day), colombianCache.get(year)!);
};

const makeHolidayLookup = (holidays?: Holiday[]): HolidayLookup => {
  if (!holidays) return colombianLookup;
  const byDay = new Map(holidays.map(h => [`${h.date.getFullYear()}-${h.date.getMonth()}-${h.date.getDate()}`, h]));
  return (year, monthIndex, day) => byDay.get(`${year}-${monthIndex}-${day}`);
};

// ----------------------------------------------------------------------------
// Escritorio
// ----------------------------------------------------------------------------

const DESK_COLS = [152.7, 181.1, 209.5, 238.0, 266.4, 294.8, 323.2];
const DESK_WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const DESK_ROW = 19.5;
const DESK_LABEL_X = 73;

/** Bloque de un mes del escritorio: número grande + nombre a la izquierda, cuadrícula a la derecha. */
function DeskMonthBlock({ month, headerY, showYear, holidayOn }: { month: CalendarMonth; headerY: number; showYear: boolean; holidayOn: HolidayLookup }) {
  const weeks = getMonthWeeks(month.year, month.monthIndex);
  const label = { fontFamily: FONT.label, fontWeight: 600, fontSize: 10.5, letterSpacing: 1.6, fill: COLOR.deskText, textAnchor: 'middle' as const };
  return (
    <g>
      {DESK_WEEKDAYS.map((d, i) => (
        <text key={d} x={DESK_COLS[i]} y={headerY} textAnchor="middle" fontFamily={FONT.desk} fontWeight={500} fontSize={10.5} fill={i === 6 ? COLOR.deskRed : COLOR.deskText}>{d}</text>
      ))}
      {weeks.map((week, w) => week.map((day, i) => {
        if (!day) return null;
        const holiday = holidayOn(month.year, month.monthIndex, day);
        return (
          <text
            key={`${w}-${i}`}
            x={DESK_COLS[i]}
            y={headerY + DESK_ROW * (w + 1)}
            textAnchor="middle"
            fontFamily={FONT.desk}
            fontSize={10.5}
            fontWeight={holiday ? 700 : 500}
            fill={holiday || i === 6 ? COLOR.deskRed : COLOR.deskText}
          >
            {holiday && <title>{holiday.name}</title>}
            {day}
          </text>
        );
      }))}
      <text x={DESK_LABEL_X} y={headerY + 78.5} textAnchor="middle" fontFamily={FONT.number} fontSize={95} fill={COLOR.deskNumber}>
        {month.monthIndex + 1}
      </text>
      <text x={DESK_LABEL_X} y={headerY + 109.6} {...label}>{month.name.toUpperCase()}</text>
      {showYear && <text x={DESK_LABEL_X} y={headerY + 123.9} {...label}>{month.year}</text>}
    </g>
  );
}

function DeskCover({ title, logoSrc }: { title: string[]; logoSrc?: string }) {
  return (
    <PageFrame type="desk">
      <CoverFrame type="desk" logoSrc={logoSrc} />
      <Overlay type="desk">
        {title.map((line, i) => (
          <text key={i} x={177} y={247.8 + i * 37.5} textAnchor="middle" fontFamily={FONT.label} fontWeight={400} fontSize={27} fill={COLOR.coverText}>{line}</text>
        ))}
      </Overlay>
    </PageFrame>
  );
}

function DeskMonthPage({ month, renderPhoto, holidayOn }: { month: CalendarMonth; renderPhoto?: RenderPhoto; holidayOn: HolidayLookup }) {
  return (
    <PageFrame type="desk">
      <PhotoSlots type="desk" imagesPerMonth={1} renderPhoto={renderPhoto} />
      <Overlay type="desk">
        <DeskMonthBlock month={month} headerY={368.1} showYear={false} holidayOn={holidayOn} />
      </Overlay>
    </PageFrame>
  );
}

function DeskNotesPage({ months, holidayOn }: { months: CalendarMonth[]; holidayOn: HolidayLookup }) {
  return (
    <PageFrame type="desk">
      <Overlay type="desk">
        <DeskMonthBlock month={months[0]} headerY={60.8} showYear holidayOn={holidayOn} />
        <DeskMonthBlock month={months[1]} headerY={215.8} showYear holidayOn={holidayOn} />
        <text x={177} y={360.4} textAnchor="middle" fontFamily={FONT.label} fontWeight={300} fontSize={9.3} letterSpacing={3.7} fill={COLOR.notes}>NOTAS</text>
        {[0, 1, 2, 3].map(i => (
          <line key={i} x1={35} y1={391.5 + i * 29} x2={315} y2={391.5 + i * 29} stroke={COLOR.notesLine} strokeWidth={1.2} strokeDasharray="4 2" />
        ))}
      </Overlay>
    </PageFrame>
  );
}

// ----------------------------------------------------------------------------
// Pared
// ----------------------------------------------------------------------------

const WALL_GRID = { x: 46, y: 162, w: 758, h: 396.7 };
const WALL_WEEKDAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

function WallCover({ logoSrc }: { logoSrc?: string }) {
  return (
    <PageFrame type="wall">
      <CoverFrame type="wall" logoSrc={logoSrc} />
    </PageFrame>
  );
}

function WallPhotoPage({ imagesPerMonth, renderPhoto, rotated }: { imagesPerMonth: number; renderPhoto?: RenderPhoto; rotated: boolean }) {
  return (
    <PageFrame type="wall">
      <div style={{ position: 'absolute', inset: 0, transform: rotated ? 'rotate(180deg)' : undefined }}>
        <PhotoSlots type="wall" imagesPerMonth={imagesPerMonth} renderPhoto={renderPhoto} />
      </div>
    </PageFrame>
  );
}

function WallGridPage({ month, holidayOn }: { month: CalendarMonth; holidayOn: HolidayLookup }) {
  const weeks = getMonthWeeks(month.year, month.monthIndex);
  const colW = WALL_GRID.w / 7;
  // Siempre 5 filas: la sexta semana se escribe debajo, dentro de la misma celda (p. ej. "24 / 31").
  const rows = 5;
  const rowH = WALL_GRID.h / rows;
  const line = { stroke: COLOR.wallLine, strokeWidth: 1 };

  const dayText = (day: number, col: number, y: number) => {
    const holiday = holidayOn(month.year, month.monthIndex, day);
    return (
      <text
        key={`${day}`}
        x={WALL_GRID.x + colW * (col + 1) - 4.5}
        y={y}
        textAnchor="end"
        fontFamily={FONT.wall}
        fontSize={19.3}
        fontWeight={holiday || col === 6 ? 700 : 400}
        fill={holiday ? COLOR.wallRed : COLOR.wallText}
      >
        {holiday && <title>{holiday.name}</title>}
        {day}
      </text>
    );
  };

  return (
    <PageFrame type="wall">
      <Overlay type="wall">
        <text x={49.5} y={99.2} fontFamily={FONT.wall} fontWeight={700} fontSize={33.3} fill={COLOR.wallGray}>
          {`/ ${month.name.toUpperCase()} - ${month.year}`}
        </text>
        {WALL_WEEKDAYS.map((d, i) => (
          <text key={d} x={WALL_GRID.x + colW * (i + 0.5)} y={150.7} textAnchor="middle" fontFamily={FONT.wall} fontWeight={700} fontSize={14.7} fill={COLOR.wallGray}>{d}</text>
        ))}
        <rect x={WALL_GRID.x} y={WALL_GRID.y} width={WALL_GRID.w} height={WALL_GRID.h} fill="none" {...line} />
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`c${i}`} x1={WALL_GRID.x + colW * (i + 1)} y1={WALL_GRID.y} x2={WALL_GRID.x + colW * (i + 1)} y2={WALL_GRID.y + WALL_GRID.h} {...line} />
        ))}
        {Array.from({ length: rows - 1 }, (_, i) => (
          <line key={`r${i}`} x1={WALL_GRID.x} y1={WALL_GRID.y + rowH * (i + 1)} x2={WALL_GRID.x + WALL_GRID.w} y2={WALL_GRID.y + rowH * (i + 1)} {...line} />
        ))}
        {weeks.map((week, w) => week.map((day, col) => {
          if (!day) return null;
          const row = Math.min(w, rows - 1);
          const y = WALL_GRID.y + rowH * row + (w >= rows ? 54.5 : 21.8);
          return dayText(day, col, y);
        }))}
      </Overlay>
    </PageFrame>
  );
}

// ----------------------------------------------------------------------------
// Entrada pública
// ----------------------------------------------------------------------------

/**
 * Un mes tal como se ve el calendario abierto: en escritorio la página del mes;
 * en pared la hoja de la foto (derecha) sobre la del mes, como cuelga.
 */
export function CalendarMonthSheet({
  type, position, year, startMonth, imagesPerMonth = 1, renderPhoto, holidays,
}: Omit<CalendarTemplatePageProps, 'page' | 'logoSrc' | 'rotateWallPhoto'> & { position: number }) {
  const common = { type, year, startMonth, imagesPerMonth, renderPhoto, holidays };
  if (type === 'desk') return <CalendarTemplatePage {...common} page={{ kind: 'month', position }} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <CalendarTemplatePage {...common} page={{ kind: 'photo', position }} />
      <div style={{ borderTop: '1px dashed #e5e7eb' }}>
        <CalendarTemplatePage {...common} page={{ kind: 'grid', position }} />
      </div>
    </div>
  );
}

export interface CalendarTemplatePageProps {
  type: CalendarType;
  page: CalendarPageSpec;
  year: number;
  startMonth: number;
  imagesPerMonth?: number;
  /** Foto de un hueco del mes `position` (0-11). `slot` va de 0 a imagesPerMonth-1. */
  renderPhoto?: (position: number, slot: number) => ReactNode;
  logoSrc?: string;
  /** Festivos a marcar (ver `getHolidaysForCountry`). Sin ella, los de Colombia. */
  holidays?: Holiday[];
  /** Pared: gira la hoja de la foto 180° como va impresa. El editor la muestra derecha. */
  rotateWallPhoto?: boolean;
}

export function CalendarTemplatePage({
  type, page, year, startMonth, imagesPerMonth = 1, renderPhoto, logoSrc, rotateWallPhoto = false, holidays,
}: CalendarTemplatePageProps) {
  const months = getCalendarMonths(startMonth, year, 14);
  const holidayOn = useMemo(() => makeHolidayLookup(holidays), [holidays]);
  switch (page.kind) {
    case 'cover': {
      if (type === 'wall') return <WallCover logoSrc={logoSrc} />;
      const last = months[11];
      return <DeskCover logoSrc={logoSrc} title={['Calendario', last.year === year ? `${year}` : `${year} - ${last.year}`]} />;
    }
    case 'month':
      return <DeskMonthPage month={months[page.position]} holidayOn={holidayOn} renderPhoto={slot => renderPhoto?.(page.position, slot)} />;
    case 'notes':
      return <DeskNotesPage months={months.slice(12, 14)} holidayOn={holidayOn} />;
    case 'photo':
      return (
        <WallPhotoPage
          imagesPerMonth={imagesPerMonth}
          rotated={rotateWallPhoto}
          renderPhoto={slot => renderPhoto?.(page.position, slot)}
        />
      );
    case 'grid':
      return <WallGridPage month={months[page.position]} holidayOn={holidayOn} />;
  }
}

const NO_HOLIDAYS_YET: Holiday[] = [];

/** Años que cubre un calendario (12 meses + los 2 de la hoja final del escritorio). */
export const getCalendarYears = (year: number, startMonth: number) =>
  [...new Set(getCalendarMonths(startMonth, year, 14).map(m => m.year))];

/**
 * Festivos del país elegido para un calendario. Colombia se resuelve al instante;
 * otro país carga `date-holidays` y mientras tanto no marca ninguno (mejor eso
 * que enseñar un instante los de Colombia en un calendario de otro país).
 */
export function useCalendarHolidays(country: string | undefined, year: number, startMonth: number): Holiday[] | undefined {
  const code = country || DEFAULT_HOLIDAY_COUNTRY;
  const key = `${code}|${year}|${startMonth}`;
  const [loaded, setLoaded] = useState<{ key: string; holidays: Holiday[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getHolidaysForCountry(code, getCalendarYears(year, startMonth)).then(holidays => {
      if (!cancelled) setLoaded({ key, holidays });
    });
    return () => { cancelled = true; };
  }, [key, code, year, startMonth]);
  if (loaded?.key === key) return loaded.holidays;
  return code === DEFAULT_HOLIDAY_COUNTRY ? undefined : NO_HOLIDAYS_YET;
}
