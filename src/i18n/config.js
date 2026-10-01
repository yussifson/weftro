import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import local JSON dictionaries
import enTranslation from '../locales/en/translation.json';
import esTranslation from '../locales/es/translation.json';
import frTranslation from '../locales/fr/translation.json';
import arTranslation from '../locales/ar/translation.json';
import zhTranslation from '../locales/zh/translation.json';

const resources = {
  en: { translation: enTranslation },
  es: { translation: esTranslation },
  fr: { translation: frTranslation },
  ar: { translation: arTranslation },
  zh: { translation: zhTranslation }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr', 'ar', 'zh'],
    debug: false,
    interpolation: {
      escapeValue: false,
    }
  });

// Handle RTL text direction dynamically
i18n.on('languageChanged', (lng) => {
  const isRTL = ['ar', 'he', 'fa', 'ur'].includes(lng.split('-')[0]);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;
