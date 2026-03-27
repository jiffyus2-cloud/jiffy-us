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
    albumExtra20x20: number;
    albumExtra30x30: number;
    albumExtraRect: number;
    mug: number;
    calendarWall: number;
    calendarDesk: number;
    photoPackBase: number;
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
    albumExtra20x20: 3750,
    albumExtra30x30: 4750,
    albumExtraRect: 4500,
    mug: 45000,
    calendarWall: 80000,
    calendarDesk: 60000,
    photoPackBase: 1000
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

const StoreConfigContext = createContext<StoreConfig>(defaultConfig);

export const StoreConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<StoreConfig>(defaultConfig);

  useEffect(() => {
    const configRef = doc(db, 'settings', 'store_config');
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        // Fusionamos los datos por si agregas campos nuevos en el futuro
        setConfig({ ...defaultConfig, ...docSnap.data() } as StoreConfig);
      } else {
        setDoc(configRef, defaultConfig);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <StoreConfigContext.Provider value={config}>
      {children}
    </StoreConfigContext.Provider>
  );
};

export const useStoreConfig = () => useContext(StoreConfigContext);