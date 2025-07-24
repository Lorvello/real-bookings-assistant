import { useEffect, useState } from 'react';

interface LocationData {
  country_code: string;
  country_name: string;
}

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

export const useGoogleTranslate = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [isTranslated, setIsTranslated] = useState(false);

  useEffect(() => {
    const initializeTranslation = async () => {
      try {
        // Check if user preference is already stored
        const savedLanguage = localStorage.getItem('preferred-language');
        
        if (savedLanguage) {
          if (savedLanguage === 'nl') {
            await translateToLanguage('nl');
          }
          setIsLoading(false);
          return;
        }

        // Detect location via IP
        const response = await fetch('https://ipapi.co/json/');
        const data: LocationData = await response.json();
        
        setDetectedCountry(data.country_name);
        
        // Auto-translate for Netherlands and Belgium
        if (data.country_code === 'NL' || data.country_code === 'BE') {
          await translateToLanguage('nl');
          localStorage.setItem('preferred-language', 'nl');
        } else {
          localStorage.setItem('preferred-language', 'en');
        }
        
      } catch (error) {
        console.log('Location detection failed, using browser language fallback');
        
        // Fallback to browser language
        const browserLang = navigator.language.toLowerCase();
        if (browserLang.startsWith('nl')) {
          await translateToLanguage('nl');
          localStorage.setItem('preferred-language', 'nl');
        } else {
          localStorage.setItem('preferred-language', 'en');
        }
      }
      
      setIsLoading(false);
    };

    const translateToLanguage = async (langCode: string) => {
      return new Promise<void>((resolve) => {
        const checkGoogleTranslate = () => {
          if (window.google?.translate?.TranslateElement) {
            // Initialize Google Translate
            new window.google.translate.TranslateElement({
              pageLanguage: 'en',
              includedLanguages: 'nl,en,de,fr,es,it,pt,ru,zh,ja,ko,ar,hi,th,vi,tr,pl,sv,da,no,fi,cs,hu,ro,bg,hr,sk,sl,et,lv,lt,mt',
              layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
              autoDisplay: false,
            }, 'google_translate_element');

            // Auto-translate if needed
            if (langCode === 'nl') {
              setTimeout(() => {
                const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement;
                if (selectElement) {
                  selectElement.value = langCode;
                  selectElement.dispatchEvent(new Event('change'));
                  setIsTranslated(true);
                }
                resolve();
              }, 1000);
            } else {
              resolve();
            }
          } else {
            setTimeout(checkGoogleTranslate, 100);
          }
        };
        
        checkGoogleTranslate();
      });
    };

    // Initialize Google Translate Element function
    window.googleTranslateElementInit = () => {
      initializeTranslation();
    };

    // Load Google Translate script if not already loaded
    if (!document.querySelector('script[src*="translate.google.com"]')) {
      const script = document.createElement('script');
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.head.appendChild(script);
    } else {
      initializeTranslation();
    }

  }, []);

  return {
    isLoading,
    detectedCountry,
    isTranslated
  };
};