import { useEffect, useState } from 'react';

export const useGoogleTranslate = () => {
  const [isTranslated, setIsTranslated] = useState(false);

  useEffect(() => {
    // Check if page is translated
    const checkTranslationStatus = () => {
      const savedLanguage = localStorage.getItem('preferred-language');
      const body = document.body;
      
      if (savedLanguage === 'nl' && body.classList.contains('translated-ltr')) {
        setIsTranslated(true);
      }
    };

    // Check periodically for translation status
    const interval = setInterval(checkTranslationStatus, 1000);
    
    // Initial check
    setTimeout(checkTranslationStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  return {
    isTranslated
  };
};