
import { useGoogleTranslate } from "@/hooks/useGoogleTranslate";

export const MultiLanguageCard = () => {
  const { detectedLanguage, isTranslated } = useGoogleTranslate();

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Automatic Translation Status */}
      <div className="absolute inset-3 flex flex-col justify-center items-center text-center">
        <div className="text-4xl mb-4">🌍</div>
        <h3 className="text-white text-lg font-semibold mb-2">
          Automatic Translation
        </h3>
        <p className="text-slate-300 text-sm mb-4">
          Website automatically detects your browser language
        </p>
        
        <div className="bg-slate-700/40 rounded-lg p-3 border border-slate-600/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-emerald-300 text-xs font-medium">
              Language Detected: {detectedLanguage === 'nl' ? 'Dutch 🇳🇱' : 'English 🇬🇧'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isTranslated ? 'bg-blue-500' : 'bg-slate-500'}`}></div>
            <span className={`text-xs ${isTranslated ? 'text-blue-300' : 'text-slate-400'}`}>
              {isTranslated ? 'Translation Active' : 'Original Content'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Background accent elements */}
      <div className="absolute bottom-4 right-4 w-3 h-3 bg-emerald-500/40 rounded-full" />
    </div>
  );
};
