import { Tag } from 'lucide-react';
import { useStoreConfig } from '../context/StoreConfigContext';
import { ALBUM_BASE_PAGES, applyStoreDiscount, formatCOP, getAlbumPrice } from '../utils/albumPricing';

/**
 * Resumen de precio mientras se elige tapa y tamaño. Es un precio "desde":
 * cubre las 40 páginas base; las páginas extra y el envío se suman después
 * (el desglose completo sale en el checkout, con el mismo cálculo).
 */
export default function AlbumPriceSummary({ size, coverType }: { size: string; coverType: 'Tela' | 'Papel' }) {
  const { prices, discounts, configLoaded } = useStoreConfig();

  // Hasta que llegan los precios de la tienda no se enseña ninguna cifra: los
  // valores iniciales del código podrían no ser los vigentes.
  if (!configLoaded) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 animate-pulse" aria-busy="true">
        <div className="h-3 w-32 bg-gray-200 rounded" />
        <div className="h-6 w-40 bg-gray-200 rounded mt-2" />
      </div>
    );
  }

  const price = getAlbumPrice(prices, size, coverType === 'Tela');
  const hasDiscount = discounts.active && discounts.percentage > 0;
  const finalPrice = applyStoreDiscount(price.base, discounts);
  const sizeLabel = size.replace(/^(Cuadrado|Horizontal|Vertical)\s+/, '');

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3" aria-live="polite">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Precio de tu álbum</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Desde</p>
        </div>
        <div className="text-right shrink-0">
          {hasDiscount && (
            <p className="text-xs text-gray-400 line-through leading-tight">{formatCOP(price.base)}</p>
          )}
          <div className="flex items-center justify-end gap-2">
            {hasDiscount && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                <Tag className="w-3 h-3" /> -{discounts.percentage}%
              </span>
            )}
            {/* key: al cambiar tapa o tamaño la cifra entra de nuevo con un fundido. */}
            <p key={finalPrice} className="text-xl sm:text-2xl font-black text-gray-900 leading-tight animate-in fade-in duration-300">
              {formatCOP(finalPrice)}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-xs text-gray-500">
        <span className="text-gray-700 font-medium">
          Tapa de {coverType} · {sizeLabel} · {ALBUM_BASE_PAGES} páginas incluidas
        </span>
        <span>Página adicional {formatCOP(price.extraPage)} · envío aparte</span>
      </div>
    </div>
  );
}
