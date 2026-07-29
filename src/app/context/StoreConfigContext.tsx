import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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
    mug: number;
    calendarWall: number;
    calendarDesk: number;
    photoPackBase: number;
    shippingCali: number;
    shippingNational: number;
  };
  discounts: {
    active: boolean;
    percentage: number;
  };
  promotions: Promotion[];
}

const defaultConfig: StoreConfig = {
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
    mug: 45000,
    calendarWall: 80000,
    calendarDesk: 60000,
    photoPackBase: 1000,
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
      active: true
    },
    {
      id: 'promo-2',
      title: 'Envío Gratis',
      desc: 'Envíos gratuitos a todo el país en pedidos mayores a $150.000.',
      icon: 'Truck',
      colorTheme: 'green',
      active: true
    },
    {
      id: 'promo-3',
      title: 'Regalo Sorpresa',
      desc: 'Recibe un detalle especial con tu primera compra en la tienda.',
      icon: 'Gift',
      colorTheme: 'purple',
      active: true
    }
  ]
};

interface StoreConfigContextValue extends StoreConfig {
  configLoaded: boolean;
  configError: string | null;
}

const StoreConfigContext = createContext<StoreConfigContextValue>({ ...defaultConfig, configLoaded: false, configError: null });

export const StoreConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<StoreConfig>(defaultConfig);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const configRef = doc(db, 'settings', 'store_config');
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        // Deep merge para que campos nuevos en defaultConfig no sean pisados por docs viejos de Firebase
        const data = docSnap.data() as Partial<StoreConfig>;
        setConfig({
          ...defaultConfig,
          ...data,
          prices: { ...defaultConfig.prices, ...(data.prices || {}) },
        } as StoreConfig);
      } else {
        console.warn('El documento settings/store_config no existe — sembrando valores por defecto. Si esto es inesperado, el documento pudo haber sido borrado.');
        setDoc(configRef, defaultConfig);
      }
      setConfigError(null);
      setConfigLoaded(true);
    }, (error) => {
      // No marcamos configLoaded=true en un error: así ningún guardado puede
      // sobrescribir la config real con los valores por defecto mientras la carga sigue fallando.
      console.error('Error al escuchar settings/store_config:', error);
      setConfigError(error.message);
    });

    return () => unsubscribe();
  }, []);

  return (
    <StoreConfigContext.Provider value={{ ...config, configLoaded, configError }}>
      {children}
    </StoreConfigContext.Provider>
  );
};

export const useStoreConfig = () => useContext(StoreConfigContext);