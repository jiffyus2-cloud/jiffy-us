// ============================================================================
// Paneles del paso "¿Cuántas páginas?"
// ============================================================================
// Piezas de presentación del selector de páginas de PhotoOrganizer: la
// recomendación, cómo quedarán repartidas las fotos y el resumen de precio.
// No calculan nada por su cuenta: reciben el plan de pageDistribution (el mismo
// que se aplica al crear el álbum) y lo pintan.
// ============================================================================

import { Check, Sparkles } from 'lucide-react';
import type { SizeCounts } from '../utils/pageDistribution';
import { ALBUM_BASE_PAGES, formatCOP } from '../utils/albumPricing';
import { RichText } from './ui/RichText';

/** Celdas de la miniatura de cada tamaño de página, en % de la página. */
const GLYPH_CELLS: Record<number, Array<[number, number, number, number]>> = {
  1: [[0, 0, 100, 100]],
  2: [[0, 0, 50, 100], [50, 0, 50, 100]],
  3: [[0, 0, 50, 100], [50, 0, 50, 50], [50, 50, 50, 50]],
  4: [[0, 0, 50, 50], [50, 0, 50, 50], [0, 50, 50, 50], [50, 50, 50, 50]],
  6: [0, 1, 2].flatMap(c => [0, 1].map(r => [c * 33.33, r * 50, 33.33, 50] as [number, number, number, number])),
  9: [0, 1, 2].flatMap(c => [0, 1, 2].map(r => [c * 33.33, r * 33.33, 33.33, 33.33] as [number, number, number, number])),
};

/** Tono de cada tamaño en la barra de reparto: 1, 2 y 4 son los protagonistas. */
const SIZE_TONE: Record<number, { bar: string; glyph: string }> = {
  1: { bar: 'bg-gray-900', glyph: 'fill-gray-900' },
  2: { bar: 'bg-gray-600', glyph: 'fill-gray-600' },
  4: { bar: 'bg-gray-400', glyph: 'fill-gray-400' },
  3: { bar: 'bg-stone-300', glyph: 'fill-stone-300' },
  6: { bar: 'bg-stone-200', glyph: 'fill-stone-300' },
  9: { bar: 'bg-stone-200', glyph: 'fill-stone-300' },
};

/** Miniatura de una página con `size` fotos. */
export function PageLayoutGlyph({ size, className = 'w-5 h-5' }: { size: number; className?: string }) {
  const cells = GLYPH_CELLS[size] ?? GLYPH_CELLS[1];
  const tone = SIZE_TONE[size]?.glyph ?? 'fill-gray-400';
  return (
    <svg viewBox="0 0 100 100" className={`${className} shrink-0`} aria-hidden="true">
      {cells.map(([x, y, w, h], i) => (
        <rect key={i} x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={4} className={tone} />
      ))}
    </svg>
  );
}

/** Tamaños con al menos una página, de menor a mayor. */
function usedSizes(counts: SizeCounts): Array<[number, number]> {
  return [...counts].filter(([, n]) => n > 0).sort(([a], [b]) => a - b);
}

const photoLabel = (size: number) => (size === 1 ? '1 foto' : `${size} fotos`);

/**
 * Barra apilada + leyenda: cuántas páginas de cada tamaño saldrán con la
 * cantidad elegida.
 */
export function PlanComposition({ counts, compact = false }: { counts: SizeCounts; compact?: boolean }) {
  const sizes = usedSizes(counts);
  const total = sizes.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) return null;

  return (
    <div data-testid="plan-composition">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        {sizes.map(([size, n]) => (
          <div
            key={size}
            className={`${SIZE_TONE[size]?.bar ?? 'bg-gray-300'} h-full border-r-2 border-white last:border-r-0`}
            style={{ width: `${(n / total) * 100}%` }}
            title={`${n} páginas de ${photoLabel(size)}`}
          />
        ))}
      </div>
      <ul className={`mt-3 flex flex-wrap ${compact ? 'gap-x-4 gap-y-1.5' : 'gap-x-5 gap-y-2'}`}>
        {sizes.map(([size, n]) => (
          <li key={size} className="flex items-center gap-1.5 text-sm text-gray-700">
            <PageLayoutGlyph size={size} className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
            <span>
              <strong className="font-semibold text-gray-900">{n}</strong>{' '}
              {n === 1 ? 'pág.' : 'págs.'} de {photoLabel(size)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface RecommendationCardProps {
  photos: number;
  pages: number;
  counts: SizeCounts;
  description: string;
  /** La cantidad elegida ahora mismo ya es la recomendada. */
  selected: boolean;
  onApply: () => void;
}

/** La cantidad de páginas que propone el sistema, con su reparto y un botón para aplicarla. */
export function RecommendationCard({ photos, pages, counts, description, selected, onApply }: RecommendationCardProps) {
  return (
    <section
      data-testid="page-recommendation"
      aria-label="Cantidad de páginas recomendada"
      className={`rounded-xl border-2 p-5 sm:p-6 transition-colors ${
        selected ? 'border-black bg-gray-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <Sparkles className="w-3.5 h-3.5" />
            Recomendado para tus {photos} fotos
          </p>
          <p className="mt-1 text-4xl font-bold tracking-tight">
            {pages} <span className="text-xl font-medium text-gray-500">páginas</span>
          </p>
        </div>
        {selected ? (
          <span className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto rounded-full bg-black px-4 py-2 text-sm font-medium text-white">
            <Check className="w-4 h-4" /> Seleccionado
          </span>
        ) : (
          <button
            type="button"
            onClick={onApply}
            className="self-start sm:self-auto rounded-full border-2 border-black px-5 py-2 text-sm font-semibold hover:bg-black hover:text-white transition-colors"
          >
            Usar {pages} páginas
          </button>
        )}
      </div>
      <p className="mt-3 text-sm text-gray-600">
        <RichText text={description} />
      </p>
      <div className="mt-4">
        <PlanComposition counts={counts} compact />
      </div>
    </section>
  );
}

interface PagePriceSummaryProps {
  totalPages: number;
  extraPagePrice: number;
}

/**
 * Lo que antes eran dos avisos de color ("incluye 40 páginas base" y "cada
 * página adicional cuesta…"): es información fija, así que vive como un
 * resumen dentro de la tarjeta y se actualiza con la cantidad elegida.
 */
export function PagePriceSummary({ totalPages, extraPagePrice }: PagePriceSummaryProps) {
  const extra = Math.max(0, totalPages - ALBUM_BASE_PAGES);
  return (
    <dl data-testid="page-price-summary" className="rounded-xl bg-gray-50 px-5 py-4 text-sm space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-gray-600">Incluidas en tu álbum</dt>
        <dd className="font-medium text-gray-900">{ALBUM_BASE_PAGES} páginas</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-gray-600">
          Páginas adicionales
          <span className="block text-xs text-gray-400">{formatCOP(extraPagePrice)} c/u</span>
        </dt>
        <dd className="text-right font-medium text-gray-900">
          {extra === 0 ? (
            <span className="text-gray-500">Ninguna</span>
          ) : (
            <>
              {extra} × {formatCOP(extraPagePrice)}
              <span className="block text-base font-semibold">+ {formatCOP(extra * extraPagePrice)}</span>
            </>
          )}
        </dd>
      </div>
    </dl>
  );
}
