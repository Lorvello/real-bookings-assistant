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
    customer: "Hi, I need an appointment",
    ai: "Hello! I'd be happy to help. What service would you like?"
  },
  es: {
    customer: "Hola, necesito una cita",
    ai: "¡Hola! Estaré encantado de ayudarte. ¿Qué servicio te gustaría?"
  },
  fr: {
    customer: "Bonjour, j'ai besoin d'un rendez-vous",
    ai: "Bonjour! Je serai ravi de vous aider. Quel service souhaitez-vous?"
  },
  de: {
    customer: "Hallo, ich brauche einen Termin",
    ai: "Hallo! Gerne helfe ich Ihnen. Welche Behandlung möchten Sie?"
  },
  nl: {
    customer: "Hallo, ik wil een afspraak",
    ai: "Hallo! Graag help ik je. Voor welke behandeling?"
  },
  it: {
    customer: "Ciao, ho bisogno di un appuntamento",
    ai: "Ciao! Sarò felice di aiutarti. Che servizio vorresti?"
  },
  pt: {
    customer: "Olá, preciso de um agendamento",
    ai: "Olá! Ficarei feliz em ajudar. Que serviço você gostaria?"
  },
  ar: {
    customer: "مرحبا، أحتاج إلى موعد",
    ai: "مرحبا! سأكون سعيدا لمساعدتك. ما الخدمة التي تريدها؟"
  },
  zh: {
    customer: "你好，我需要预约",
    ai: "你好！我很乐意帮助您。您想要什么服务？"
  },
  ja: {
    customer: "こんにちは、予約が必要です",
    ai: "こんにちは！喜んでお手伝いします。どのようなサービスをご希望ですか？"
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