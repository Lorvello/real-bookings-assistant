import { useGoogleTranslate } from '@/hooks/useGoogleTranslate';

export const GoogleTranslateProvider = () => {
  const { isLoading, detectedCountry, isTranslated } = useGoogleTranslate();

  return (
    <>
      {/* Hidden Google Translate Element */}
      <div id="google_translate_element" className="hidden"></div>
      
      {/* Optional: Loading indicator */}
      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg text-sm shadow-lg z-50">
          Detecting language...
        </div>
      )}

      {/* Optional: Translation status indicator */}
      {!isLoading && isTranslated && (
        <div className="fixed bottom-4 right-4 bg-green-500/90 text-white px-3 py-2 rounded-lg text-sm shadow-lg z-50 animate-fade-in">
          Auto-translated to Dutch
        </div>
      )}
    </>
  );
};