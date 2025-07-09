import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export function TranslationDemo() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const selectedLang = languages.find(lang => lang.code === selectedLanguage);
  const isRTL = ['ar'].includes(selectedLanguage);
  const messages = chatMessages[selectedLanguage as keyof typeof chatMessages];

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
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="text-xs bg-slate-700/50 border-slate-600 text-white h-8">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span>{selectedLang?.flag}</span>
                  <span>{selectedLang?.name}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 max-h-48">
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