
import { TranslationDemo } from "@/components/TranslationDemo";
import { useGoogleTranslate } from "@/hooks/useGoogleTranslate";

export const MultiLanguageCard = () => {
  const { isLoading, detectedCountry, isTranslated } = useGoogleTranslate();

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Translation Demo Interface - AI Assistant multilingual support demo */}
      <TranslationDemo />
      
      {/* Auto-translation status indicator */}
      <div className="absolute top-4 right-4 flex flex-col items-end space-y-2">
        {isLoading && (
          <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
            Detecting location...
          </div>
        )}
        {!isLoading && detectedCountry && (
          <div className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded text-xs">
            📍 {detectedCountry}
          </div>
        )}
        {isTranslated && (
          <div className="bg-emerald-500/30 text-emerald-200 px-2 py-1 rounded text-xs">
            🌍 Auto-translated
          </div>
        )}
      </div>
      
      {/* Globe icon and background accent elements */}
      <div className="absolute bottom-4 left-4 text-emerald-400/30 text-2xl">🌍</div>
      <div className="absolute bottom-4 right-4 w-3 h-3 bg-emerald-500/40 rounded-full" />
    </div>
  );
};
