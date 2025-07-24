import React from 'react';
import { useLanguageContext, Language } from '@/contexts/LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguageContext();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'nl' : 'en');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-200 min-h-[44px]"
      title={language === 'en' ? 'Switch to Dutch' : 'Schakel naar Engels'}
    >
      <span className="text-lg">
        {language === 'en' ? '🇳🇱' : '🇬🇧'}
      </span>
      <span className="text-sm font-medium">
        {language === 'en' ? 'NL' : 'EN'}
      </span>
    </button>
  );
}