import { useGoogleTranslate } from '@/hooks/useGoogleTranslate';
import { LanguageStatusIndicator } from '@/components/LanguageStatusIndicator';

export const GoogleTranslateProvider = () => {
  const { isLoading } = useGoogleTranslate();

  return (
    <>
      {/* Hidden Google Translate Element */}
      <div id="google_translate_element" className="hidden"></div>
      
      {/* Global Language Status Indicator */}
      <LanguageStatusIndicator />
      
      {/* Loading indicator during initialization */}
      {isLoading && (
        <div className="fixed top-4 right-4 bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg text-sm shadow-lg z-50 animate-pulse">
          🌍 Setting up translation...
        </div>
      )}
    </>
  );
};