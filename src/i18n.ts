import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importation directe des fichiers JSON
import enTranslation from './locales/en.json';
import frTranslation from './locales/fr.json';

const resources = {
  en: { translation: enTranslation },
  fr: { translation: frTranslation }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'], 
      caches: ['localStorage'],
    },
    debug: false, // Désactivé pour la production
    interpolation: {
      escapeValue: false,
    }
  });

// Formatteur de date personnalisé
i18n.services.formatter?.add('datetime', (value, lng, options) => {
    if (!(value instanceof Date)) return value;
    return value.toLocaleDateString(lng, {
        day: 'numeric', 
        month: 'long', 
        year: 'numeric'
    });
});

export default i18n;
