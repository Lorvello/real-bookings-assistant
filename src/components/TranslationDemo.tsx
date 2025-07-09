import React, { useState, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'zh-tw', name: 'Chinese (Traditional)', flag: '🇹🇼' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
];

// Mock translation function for demo purposes
const mockTranslations: Record<string, Record<string, string>> = {
  'Hello, I\'d like to book an appointment for tomorrow': {
    es: 'Hola, me gustaría reservar una cita para mañana',
    fr: 'Bonjour, j\'aimerais prendre rendez-vous pour demain',
    de: 'Hallo, ich möchte einen Termin für morgen buchen',
    it: 'Ciao, vorrei prenotare un appuntamento per domani',
    pt: 'Olá, gostaria de marcar uma consulta para amanhã',
    nl: 'Hallo, ik wil graag een afspraak maken voor morgen',
    ru: 'Привет, я хотел бы записаться на прием на завтра',
    zh: '你好，我想预约明天的约会',
    ja: 'こんにちは、明日の予約を取りたいと思います',
    ko: '안녕하세요, 내일 예약을 잡고 싶습니다',
    ar: 'مرحبا، أود حجز موعد لغدا',
    he: 'שלום, אני רוצה לקבוע תור למחר',
    hi: 'नमस्ते, मैं कल के लिए एक अपॉइंटमेंट बुक करना चाहूंगा',
  }
};

const translateText = (text: string, targetLang: string): string => {
  if (targetLang === 'en') return text;
  return mockTranslations[text]?.[targetLang] || `[${targetLang.toUpperCase()}] ${text}`;
};

export function TranslationDemo() {
  const [inputText, setInputText] = useState("Hello, I'd like to book an appointment for tomorrow");
  const [selectedLanguage, setSelectedLanguage] = useState('es');

  const translatedText = useMemo(() => {
    return translateText(inputText, selectedLanguage);
  }, [inputText, selectedLanguage]);

  const selectedLang = languages.find(lang => lang.code === selectedLanguage);
  const isRTL = ['ar', 'he'].includes(selectedLanguage);

  return (
    <div className="absolute inset-3 bg-slate-800/60 rounded-lg border border-slate-700/50 backdrop-blur-sm p-3">
      {/* Badge */}
      <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-medium">
        200+ Languages
      </div>

      <div className="space-y-3 h-full flex flex-col">
        {/* Input Field */}
        <div className="space-y-1">
          <label className="text-xs text-slate-300 font-medium">Enter text to translate:</label>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Hello, I'd like to book an appointment for tomorrow"
            className="text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 h-8"
          />
        </div>

        {/* Language Selection */}
        <div className="space-y-1">
          <label className="text-xs text-slate-300 font-medium">Translate to:</label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="text-xs bg-slate-700/50 border-slate-600 text-white h-8">
              <SelectValue>
                <span className="flex items-center gap-1">
                  <span>{selectedLang?.flag}</span>
                  <span>{selectedLang?.name}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 max-h-32">
              {languages.map((lang) => (
                <SelectItem 
                  key={lang.code} 
                  value={lang.code}
                  className="text-white hover:bg-slate-700 focus:bg-slate-700 text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Translation Output */}
        <div className="flex-1 space-y-1">
          <label className="text-xs text-slate-300 font-medium">Translation:</label>
          <div 
            className={`bg-slate-700/30 border border-slate-600/50 rounded p-2 text-xs text-white min-h-[60px] flex items-center ${isRTL ? 'text-right' : 'text-left'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {translatedText}
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1 text-xs text-emerald-400">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
          <span>Live translation</span>
        </div>
      </div>
    </div>
  );
}