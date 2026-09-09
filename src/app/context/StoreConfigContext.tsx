import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  INITIAL_STORE_CONFIG,
  mergeStoredConfig,
  type StoreConfig,
  type Promotion,
} from '../utils/storeConfigState';

export type { StoreConfig, Promotion };
export { INITIAL_STORE_CONFIG };

/**
 * Configuración de tienda (precios, descuentos y promociones) en vivo desde
 * Firestore.
 *
 * Lo que manda es el documento `settings/store_config`: es el último estado que
 * guardó la administración. Los valores del código son solo el punto de partida
 * mientras no haya nada guardado, y la app NO los escribe nunca — antes sí lo
 * hacía en cuanto veía el documento ausente, y eso resucitaba los precios y las
 * promociones de fábrica por encima de lo que había configurado la tienda.
 */

interface StoreConfigContextValue extends StoreConfig {
  configLoaded: boolean;
  configError: string | null;
  /** false mientras la tienda funcione con los valores iniciales del código. */
  configExists: boolean;
}

const StoreConfigContext = createContext<StoreConfigContextValue>({
  ...INITIAL_STORE_CONFIG,
  configLoaded: false,
  configError: null,
  configExists: false,
});

export const StoreConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<StoreConfig>(INITIAL_STORE_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configExists, setConfigExists] = useState(false);

  useEffect(() => {
    const configRef = doc(db, 'settings', 'store_config');
    const unsubscribe = onSnapshot(
      configRef,
      docSnap => {
        // Un "no existe" que viene de la caché local no es una respuesta: es que
        // todavía no ha contestado el servidor. Darlo por bueno haría que el panel
        // sembrara sus formularios con los valores iniciales y que el siguiente
        // guardado pisara la configuración real de la tienda.
        if (!docSnap.exists() && docSnap.metadata.fromCache) return;

        setConfig(mergeStoredConfig(docSnap.exists() ? docSnap.data() : null));
        setConfigExists(docSnap.exists());
        setConfigError(null);
        setConfigLoaded(true);
      },
      error => {
        // No marcamos configLoaded=true en un error: así ningún guardado puede
        // sobrescribir la config real mientras la carga sigue fallando.
        console.error('Error al escuchar settings/store_config:', error);
        setConfigError(error.message);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <StoreConfigContext.Provider value={{ ...config, configLoaded, configError, configExists }}>
      {children}
    </StoreConfigContext.Provider>
  );
};

export const useStoreConfig = () => useContext(StoreConfigContext);
