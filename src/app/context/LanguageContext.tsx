import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DEFAULT_TEXTS, type Language } from '../i18n/translations';
import {
  SYSTEM_TEXTS_DOC,
  EMPTY_OVERRIDES,
  parseSystemTextsDoc,
  resolveText,
  interpolate,
  type SystemTextsDoc,
  type TextOverrides,
} from '../utils/systemTexts';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Textos cambiados desde el panel de administración (settings/system_texts). */
  textOverrides: TextOverrides;
  /** false mientras no ha llegado la primera respuesta de Firestore. */
  textOverridesLoaded: boolean;
}

// Re-exportado para quien ya lo importaba desde aquí.
export { DEFAULT_TEXTS };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('es');
  // Textos cambiados desde el panel, en vivo. Lectura pública (settings/*), así
  // que también llegan a visitantes sin sesión. Si falla, se usan los del código.
  const [textOverrides, setTextOverrides] = useState<TextOverrides>(EMPTY_OVERRIDES);
  const [textOverridesLoaded, setTextOverridesLoaded] = useState(false);

  useEffect(() => {
    const ref = doc(db, SYSTEM_TEXTS_DOC.collection, SYSTEM_TEXTS_DOC.id);
    return onSnapshot(
      ref,
      snap => {
        setTextOverrides(parseSystemTextsDoc(snap.exists() ? (snap.data() as SystemTextsDoc) : null));
        setTextOverridesLoaded(true);
      },
      err => {
        console.error('Error al escuchar settings/system_texts:', err);
        setTextOverrides(EMPTY_OVERRIDES);
        setTextOverridesLoaded(true);
      }
    );
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const value = resolveText(key, language, textOverrides, DEFAULT_TEXTS);
    if (!value) return key;
    return interpolate(value, params);
  }, [language, textOverrides]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, textOverrides, textOverridesLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
