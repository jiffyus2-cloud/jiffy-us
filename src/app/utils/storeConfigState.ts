/**
 * Estado de la configuración de tienda (precios, descuentos y promociones).
 *
 * FILOSOFÍA, igual que con las imágenes del sistema: lo que hay en el código es
 * el ESTADO INICIAL, el que se ve mientras nadie haya guardado nada. En cuanto
 * la administración guarda, manda el documento y el código deja de opinar.
 *
 * La app NUNCA escribe estos valores iniciales en Firestore. Antes el contexto
 * sembraba el documento en cuanto lo veía ausente, y eso resucitaba los precios
 * y las promociones de fábrica por encima de lo guardado: basta una lectura que
 * llega de la caché local antes que la del servidor para que el documento
 * "no exista" durante un instante.
 */

export interface Promotion {
  id: string;
  title: string;
  desc: string;
  icon: string; // 'Tag' | 'Truck' | 'Gift' | 'Star' | 'ShoppingBag'
  colorTheme: string; // 'blue' | 'green' | 'purple' | 'amber' | 'rose'
  active: boolean;
}

export interface StoreConfig {
  prices: {
    album20x20: number;
    album30x30: number;
    albumRect: number;
    albumTela20x20: number;
    albumTela30x30: number;
    albumTelaRect: number;
    albumExtra20x20: number;
    albumExtra30x30: number;
    albumExtraRect: number;
    customAlbum20x20: number;
    customAlbum30x30: number;
    customAlbumRect: number;
    calendarWall: number;
    calendarDesk: number;
    shippingCali: number;
    shippingNational: number;
  };
  discounts: {
    active: boolean;
    percentage: number;
  };
  promotions: Promotion[];
}

/** Valores con los que arranca la tienda mientras no haya nada guardado. */
export const INITIAL_STORE_CONFIG: StoreConfig = {
  prices: {
    album20x20: 150000,
    album30x30: 190000,
    albumRect: 180000,
    albumTela20x20: 170000,
    albumTela30x30: 210000,
    albumTelaRect: 200000,
    albumExtra20x20: 3750,
    albumExtra30x30: 4750,
    albumExtraRect: 4500,
    customAlbum20x20: 280000,
    customAlbum30x30: 350000,
    customAlbumRect: 330000,
    calendarWall: 80000,
    calendarDesk: 60000,
    shippingCali: 15000,
    shippingNational: 20000,
  },
  discounts: {
    active: false,
    percentage: 10,
  },
  promotions: [
    {
      id: 'promo-1',
      title: 'Descuento Especial',
      desc: 'Aprovecha nuestras ofertas de temporada.',
      icon: 'Tag',
      colorTheme: 'blue',
      active: true,
    },
    {
      id: 'promo-2',
      title: 'Envío Gratis',
      desc: 'Envíos gratuitos a todo el país en pedidos mayores a $150.000.',
      icon: 'Truck',
      colorTheme: 'green',
      active: true,
    },
    {
      id: 'promo-3',
      title: 'Regalo Sorpresa',
      desc: 'Recibe un detalle especial con tu primera compra en la tienda.',
      icon: 'Gift',
      colorTheme: 'purple',
      active: true,
    },
  ],
};

/**
 * Combina lo guardado con el estado inicial.
 *
 * Regla: **lo guardado manda siempre que exista**, incluso si es una lista vacía
 * de promociones o un precio a cero — vaciar las promociones es una decisión
 * legítima y no puede deshacerse sola. El inicial solo rellena lo que el
 * documento no tiene, que en la práctica son las claves nuevas que añade una
 * versión posterior del código (un producto nuevo necesita algún precio).
 */
export function mergeStoredConfig(
  stored: Partial<StoreConfig> | null | undefined,
  initial: StoreConfig = INITIAL_STORE_CONFIG
): StoreConfig {
  const data = stored ?? {};

  return {
    prices: { ...initial.prices, ...(isObject(data.prices) ? data.prices : {}) },
    discounts: { ...initial.discounts, ...(isObject(data.discounts) ? data.discounts : {}) },
    // Una lista guardada se respeta tal cual; solo se cae a las iniciales cuando
    // el documento no trae ninguna.
    promotions: Array.isArray(data.promotions) ? data.promotions : initial.promotions,
  };
}

/**
 * Se queda solo con lo que se guarda. El contexto añade banderas (`configLoaded`,
 * `configError`, `configExists`) y, como el panel copia el contexto entero a su
 * formulario, esas banderas acababan escribiéndose dentro del documento.
 */
export function pickStoreConfig(value: StoreConfig): StoreConfig {
  return {
    prices: { ...value.prices },
    discounts: { ...value.discounts },
    promotions: (value.promotions ?? []).map(promotion => ({ ...promotion })),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
