import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LANGUAGES, DEFAULT_LANGUAGE, STORAGE_LANG_KEY } from './languages';
import { translations } from './translations';
import { storageService } from '../services/storageService';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return storageService.loadPreference(STORAGE_LANG_KEY, DEFAULT_LANGUAGE);
  });

  const setLanguage = useCallback((code) => {
    const validCode = LANGUAGES.some((l) => l.code === code) ? code : DEFAULT_LANGUAGE;
    setLanguageState(validCode);
    storageService.savePreference(STORAGE_LANG_KEY, validCode);
    // Update HTML lang attribute for accessibility
    try {
      document.documentElement.lang = validCode;
    } catch {
      // Ignore if document not accessible
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // Ignore
    }
  }, [language]);

  const t = useCallback(
    (key, fallback = '') => {
      const currentDict = translations[language] || translations[DEFAULT_LANGUAGE] || {};
      if (currentDict[key] !== undefined) {
        return currentDict[key];
      }
      const defaultDict = translations[DEFAULT_LANGUAGE] || {};
      if (defaultDict[key] !== undefined) {
        return defaultDict[key];
      }
      return fallback || key;
    },
    [language]
  );

  const currentLanguage = useMemo(() => {
    return LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      languages: LANGUAGES,
      currentLanguage,
    }),
    [language, setLanguage, t, currentLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if used outside Provider
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: (key, fallback = '') => fallback || key,
      languages: LANGUAGES,
      currentLanguage: LANGUAGES[0],
    };
  }
  return context;
}
