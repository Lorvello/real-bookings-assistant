import { useGoogleTranslate } from '@/hooks/useGoogleTranslate';

export const LanguageStatusIndicator = () => {
  const { isTranslated } = useGoogleTranslate();

  if (!isTranslated) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div className="bg-green-500/90 text-white px-3 py-1 rounded-md text-xs shadow-lg backdrop-blur-sm">
        🌍 Automatisch vertaald
      </div>
    </div>
  );
};