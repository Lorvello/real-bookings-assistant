import { useEffect } from 'react';
import { useGoogleTranslate } from '@/hooks/useGoogleTranslate';

export const GoogleTranslateProvider = ({ children }: { children: React.ReactNode }) => {
  const { initializeTranslation } = useGoogleTranslate();

  useEffect(() => {
    // Add Google Translate element to DOM (hidden)
    const translateDiv = document.createElement('div');
    translateDiv.id = 'google_translate_element';
    translateDiv.style.display = 'none';
    document.body.appendChild(translateDiv);

    return () => {
      const existingDiv = document.getElementById('google_translate_element');
      if (existingDiv) {
        existingDiv.remove();
      }
    };
  }, []);

  return <>{children}</>;
};