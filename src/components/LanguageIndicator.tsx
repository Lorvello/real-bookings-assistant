import { useGoogleTranslate } from "@/hooks/useGoogleTranslate";

export const LanguageIndicator = () => {
  const { detectedLanguage, isTranslated } = useGoogleTranslate();

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <div className={`w-1.5 h-1.5 rounded-full ${isTranslated ? 'bg-blue-500' : 'bg-green-500'}`}></div>
        <span>
          {detectedLanguage === 'nl' ? '🇳🇱' : '🇬🇧'} 
          {isTranslated ? ' Translated' : ' Original'}
        </span>
      </div>
    </div>
  );
};