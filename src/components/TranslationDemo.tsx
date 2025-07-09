import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { ChevronDown, Search } from "lucide-react";

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'fa', name: 'Persian', flag: '🇮🇷' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'ta', name: 'Tamil', flag: '🇱🇰' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali', flag: '🇳🇵' },
  { code: 'si', name: 'Sinhala', flag: '🇱🇰' },
  { code: 'my', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'km', name: 'Khmer', flag: '🇰🇭' },
  { code: 'lo', name: 'Lao', flag: '🇱🇦' },
  { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
  { code: 'am', name: 'Amharic', flag: '🇪🇹' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
  { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'sq', name: 'Albanian', flag: '🇦🇱' },
  { code: 'eu', name: 'Basque', flag: '🇪🇸' },
  { code: 'be', name: 'Belarusian', flag: '🇧🇾' },
  { code: 'bs', name: 'Bosnian', flag: '🇧🇦' },
  { code: 'ca', name: 'Catalan', flag: '🇪🇸' },
  { code: 'et', name: 'Estonian', flag: '🇪🇪' },
  { code: 'is', name: 'Icelandic', flag: '🇮🇸' },
  { code: 'ga', name: 'Irish', flag: '🇮🇪' },
  { code: 'lv', name: 'Latvian', flag: '🇱🇻' },
  { code: 'lt', name: 'Lithuanian', flag: '🇱🇹' },
  { code: 'mk', name: 'Macedonian', flag: '🇲🇰' },
  { code: 'mt', name: 'Maltese', flag: '🇲🇹' },
  { code: 'mn', name: 'Mongolian', flag: '🇲🇳' },
  { code: 'sl', name: 'Slovenian', flag: '🇸🇮' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'cy', name: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
];

const chatMessages = {
  en: {
    customer: "I want to cancel my appointment",
    ai: "I see you have an appointment next Tuesday at 2 PM. I'll cancel that for you."
  },
  es: {
    customer: "Quiero cancelar mi cita",
    ai: "Veo que tienes una cita el próximo martes a las 2 PM. La cancelaré por ti."
  },
  fr: {
    customer: "Je veux annuler mon rendez-vous",
    ai: "Je vois que tu as un rendez-vous mardi prochain à 14h. Je vais l'annuler pour toi."
  },
  de: {
    customer: "Ich möchte meinen Termin stornieren",
    ai: "Ich sehe, dass Sie einen Termin nächsten Dienstag um 14 Uhr haben. Ich werde ihn für Sie stornieren."
  },
  nl: {
    customer: "Ik wil mijn afspraak annuleren",
    ai: "Ik zie dat je een afspraak hebt volgende week dinsdag om 14:00. Ik zal hem voor je annuleren."
  },
  it: {
    customer: "Voglio cancellare il mio appuntamento",
    ai: "Vedo che hai un appuntamento martedì prossimo alle 14. Lo cancellerò per te."
  },
  pt: {
    customer: "Quero cancelar minha consulta",
    ai: "Vejo que você tem uma consulta na próxima terça-feira às 14h. Vou cancelá-la para você."
  },
  ar: {
    customer: "أريد إلغاء موعدي",
    ai: "أرى أن لديك موعداً يوم الثلاثاء القادم في الساعة 2 مساءً. سأقوم بإلغائه لك."
  },
  zh: {
    customer: "我想取消我的预约",
    ai: "我看到您下周二下午2点有一个预约。我将为您取消。"
  },
  ja: {
    customer: "予約をキャンセルしたいです",
    ai: "来週火曜日の午後2時にご予約がありますね。キャンセルいたします。"
  }
};

interface SearchableSelectProps {
  languages: typeof languages;
  selectedLanguage: string;
  onLanguageChange: (langCode: string) => void;
}

function SearchableSelect({ languages, selectedLanguage, onLanguageChange }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredLanguages = languages.filter(lang =>
    lang.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLang = languages.find(lang => lang.code === selectedLanguage);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (langCode: string) => {
    onLanguageChange(langCode);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 h-8 bg-slate-700/50 border border-slate-600 rounded-md text-white text-xs hover:bg-slate-700/70 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <span className="flex items-center gap-2">
          <span>{selectedLang?.flag}</span>
          <span>{selectedLang?.name}</span>
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50 max-h-64 overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
              <Input
                type="text"
                placeholder="Search languages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-7 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                autoFocus
              />
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-700 focus:bg-slate-700 focus:outline-none ${
                    selectedLanguage === lang.code ? 'bg-slate-700 text-emerald-400' : 'text-white'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">
                No languages found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TranslationDemo() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const selectedLang = languages.find(lang => lang.code === selectedLanguage);
  const isRTL = ['ar', 'he', 'fa', 'ur'].includes(selectedLanguage);
  const messages = chatMessages[selectedLanguage as keyof typeof chatMessages] || chatMessages.en;

  return (
    <div className="absolute inset-3 bg-slate-800/60 rounded-lg border border-slate-700/50 backdrop-blur-sm p-3">
      {/* Badge */}
      <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-medium">
        200+ Languages
      </div>

      <div className="h-full flex flex-col">
        {/* Language Selection */}
        <div className="space-y-2 mb-4">
          <label className="text-xs text-slate-300 font-medium">Select customer language:</label>
          <SearchableSelect
            languages={languages}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        </div>

        {/* Chat Demo */}
        <div className="flex-1 space-y-3">
          {/* Customer Message */}
          <div className="flex justify-start">
            <div 
              className={`max-w-[80%] bg-slate-600/50 text-white text-xs px-3 py-2 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {messages.customer}
            </div>
          </div>

          {/* AI Response */}
          <div className="flex justify-end">
            <div 
              className={`max-w-[80%] bg-emerald-600/80 text-white text-xs px-3 py-2 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {messages.ai}
            </div>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Live chat support</span>
          </div>
          <div className="text-xs text-slate-400">
            AI responds in customer's language
          </div>
        </div>
      </div>
    </div>
  );
}