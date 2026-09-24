// ============================================================================
// Album Pricing
// ============================================================================
// Precio de un álbum según tamaño y tapa, con los precios que la tienda tenga
// configurados (settings → StoreConfig). Lo usan el resumen de precio mientras
// se configura el álbum y el checkout, para que el cliente vea siempre la misma
// cifra en los dos sitios.
// ============================================================================

import type { StoreConfig } from './storeConfigState';

type Prices = StoreConfig['prices'];

/** Páginas que incluye el precio base; a partir de ahí se cobra cada página. */
export const ALBUM_BASE_PAGES = 40;

export interface AlbumPrice {
  /** Precio del álbum con sus 40 páginas base. */
  base: number;
  /** Precio de cada página por encima de las 40 base. */
  extraPage: number;
}

type SizeFamily = '20x20' | '30x30' | 'rect';

function sizeFamily(size: string | undefined | null): SizeFamily {
  const s = size ?? '';
  if (s.includes('30x30')) return '30x30';
  if (s.includes('28x21') || s.includes('21x28')) return 'rect';
  // 20x20 y cualquier valor desconocido (pedidos antiguos): el formato por defecto.
  return '20x20';
}

/** Precio base y de página extra para un tamaño y un tipo de tapa. */
export function getAlbumPrice(prices: Prices, size: string | undefined | null, isTela: boolean): AlbumPrice {
  switch (sizeFamily(size)) {
    case '30x30':
      return { base: isTela ? prices.albumTela30x30 : prices.album30x30, extraPage: prices.albumExtra30x30 };
    case 'rect':
      return { base: isTela ? prices.albumTelaRect : prices.albumRect, extraPage: prices.albumExtraRect };
    default:
      return { base: isTela ? prices.albumTela20x20 : prices.album20x20, extraPage: prices.albumExtra20x20 };
  }
}

/** Páginas por encima de las base y lo que cuestan. */
export function getExtraPagesCost(price: AlbumPrice, totalPages: number): { count: number; cost: number } {
  const count = Math.max(0, totalPages - ALBUM_BASE_PAGES);
  return { count, cost: count * price.extraPage };
}

/**
 * Precio tras el descuento general de la tienda (si está activo). Misma fórmula
 * que el checkout, para que la cifra no difiera ni en un peso.
 */
export function applyStoreDiscount(amount: number, discounts: StoreConfig['discounts']): number {
  if (!discounts.active || discounts.percentage <= 0) return amount;
  return amount - amount * (discounts.percentage / 100);
}

export const formatCOP = (amount: number) => `$${amount.toLocaleString('es-CO')} COP`;
