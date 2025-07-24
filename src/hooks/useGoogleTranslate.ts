import { useEffect, useState } from 'react';

interface GoogleTranslateAPI {
  TranslateElement: any;
}

declare global {
  interface Window {
    google?: {
      translate: GoogleTranslateAPI;
    };
    googleTranslateElementInit?: () => void;
  }
}

export const useGoogleTranslate = () => {
  const [isTranslated, setIsTranslated] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('en');

  const detectBrowserLanguage = (): string => {
    const browserLang = navigator.language.toLowerCase();
    
    // Dutch language detection
    if (browserLang.startsWith('nl')) {
      return 'nl';
    }
    
    // Default to English for all other languages
    return 'en';
  };

  const translateToLanguage = (targetLanguage: string) => {
    if (targetLanguage === 'en') {
      // If English, show original content
      const frame = document.querySelector('.goog-te-menu-frame') as HTMLIFrameElement;
      if (frame && frame.contentDocument) {
        const originalOption = frame.contentDocument.querySelector('[data-value=""]') as HTMLElement;
        if (originalOption) {
          originalOption.click();
        }
      }
      setIsTranslated(false);
    } else {
      // Translate to target language
      const frame = document.querySelector('.goog-te-menu-frame') as HTMLIFrameElement;
      if (frame && frame.contentDocument) {
        const languageOption = frame.contentDocument.querySelector(`[data-value="${targetLanguage}"]`) as HTMLElement;
        if (languageOption) {
          languageOption.click();
          setIsTranslated(true);
        }
      } else {
        // Fallback: trigger translation programmatically
        const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (selectElement) {
          selectElement.value = targetLanguage;
          selectElement.dispatchEvent(new Event('change'));
          setIsTranslated(true);
        }
      }
    }
    
    // Store language preference
    localStorage.setItem('preferred-language', targetLanguage);
  };

  const initializeTranslation = () => {
    const storedLanguage = localStorage.getItem('preferred-language');
    const browserLanguage = detectBrowserLanguage();
    const targetLanguage = storedLanguage || browserLanguage;
    
    setDetectedLanguage(targetLanguage);
    
    // Wait for Google Translate to load
    const checkGoogleTranslate = () => {
      if (window.google && window.google.translate) {
        setTimeout(() => {
          if (targetLanguage !== 'en') {
            translateToLanguage(targetLanguage);
          }
        }, 1000);
      } else {
        setTimeout(checkGoogleTranslate, 500);
      }
    };
    
    checkGoogleTranslate();
  };

  useEffect(() => {
    // Initialize translation when component mounts
    initializeTranslation();
    
    // Re-initialize when route changes (for SPA)
    const handleRouteChange = () => {
      setTimeout(() => {
        const storedLanguage = localStorage.getItem('preferred-language');
        if (storedLanguage && storedLanguage !== 'en') {
          translateToLanguage(storedLanguage);
        }
      }, 100);
    };
    
    // Listen for navigation changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return {
    isTranslated,
    detectedLanguage,
    translateToLanguage,
    initializeTranslation
  };
};