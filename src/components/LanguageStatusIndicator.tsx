import { useGoogleTranslate } from '@/hooks/useGoogleTranslate';

export const LanguageStatusIndicator = () => {
  const { isLoading, detectedCountry, isTranslated } = useGoogleTranslate();

  if (isLoading || (!detectedCountry && !isTranslated)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 flex flex-col space-y-2 z-40">
      {detectedCountry && (
        <div className="bg-primary/90 text-primary-foreground px-3 py-1 rounded-md text-xs shadow-lg backdrop-blur-sm">
          📍 {detectedCountry}
        </div>
      )}
      {isTranslated && (
        <div className="bg-green-500/90 text-white px-3 py-1 rounded-md text-xs shadow-lg backdrop-blur-sm">
          🌍 Auto-translated
        </div>
      )}
    </div>
  );
};