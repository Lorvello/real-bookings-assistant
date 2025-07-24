import { useLanguageContext } from '@/contexts/LanguageContext';
import { translations, TranslationKeys } from '@/translations';

export function useTranslation() {
  const { language } = useLanguageContext();
  
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if translation not found
        let fallback: any = translations.en;
        for (const fallbackKey of keys) {
          if (fallback && typeof fallback === 'object' && fallbackKey in fallback) {
            fallback = fallback[fallbackKey];
          } else {
            return key; // Return key if no translation found
          }
        }
        return fallback;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return { t, language };
}