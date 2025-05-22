'use client';

import React, { useEffect, useState } from 'react';
import i18n from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Supported languages
export const languages = [
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'hi', name: 'हिन्दी (भारत)', flag: '🇮🇳' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es-MX', name: 'Español (México)', flag: '🇲🇽' },
];

interface I18nProviderProps {
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initI18n = async () => {
      if (!i18n.isInitialized) {
        await i18n
          .use(Backend)
          .use(LanguageDetector)
          .use(initReactI18next)
          .init({
            fallbackLng: 'en-GB',
            debug: process.env.NODE_ENV === 'development',
            interpolation: {
              escapeValue: false,
            },
            react: {
              useSuspense: false,
            },
            backend: {
              loadPath: '/locales/{{lng}}/{{ns}}.json',
            },
            ns: ['common'],
            defaultNS: 'common',
          });
      }
      setIsInitialized(true);
    };

    initI18n();
  }, []);

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
