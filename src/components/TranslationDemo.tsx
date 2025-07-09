import React, { useState, useEffect, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search } from "lucide-react";

const languages = [
  // Popular languages first
  { code: 'es', name: 'Spanish', flag: '🇪🇸', popular: true },
  { code: 'fr', name: 'French', flag: '🇫🇷', popular: true },
  { code: 'de', name: 'German', flag: '🇩🇪', popular: true },
  { code: 'it', name: 'Italian', flag: '🇮🇹', popular: true },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', popular: true },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', popular: true },
  { code: 'zh', name: 'Chinese (Simplified)', flag: '🇨🇳', popular: true },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', popular: true },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', popular: true },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', popular: true },
  // Other languages
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
  { code: 'sl', name: 'Slovenian', flag: '🇸🇮' },
  { code: 'lv', name: 'Latvian', flag: '🇱🇻' },
  { code: 'lt', name: 'Lithuanian', flag: '🇱🇹' },
  { code: 'et', name: 'Estonian', flag: '🇪🇪' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'ca', name: 'Catalan', flag: '🇪🇸' },
  { code: 'eu', name: 'Basque', flag: '🇪🇸' },
  { code: 'gl', name: 'Galician', flag: '🇪🇸' },
  { code: 'cy', name: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { code: 'ga', name: 'Irish', flag: '🇮🇪' },
  { code: 'mt', name: 'Maltese', flag: '🇲🇹' },
  { code: 'is', name: 'Icelandic', flag: '🇮🇸' },
  { code: 'fo', name: 'Faroese', flag: '🇫🇴' },
  { code: 'sq', name: 'Albanian', flag: '🇦🇱' },
  { code: 'mk', name: 'Macedonian', flag: '🇲🇰' },
  { code: 'bs', name: 'Bosnian', flag: '🇧🇦' },
  { code: 'me', name: 'Montenegrin', flag: '🇲🇪' },
];

const translateText = async (text: string, targetLang: string): Promise<string> => {
  if (!text.trim()) return '';
  if (targetLang === 'en') return text;

  try {
    const { data, error } = await supabase.functions.invoke('translate-text', {
      body: { text: text.trim(), targetLang, sourceLang: 'auto' }
    });

    if (error) {
      console.error('Translation error:', error);
      return `Translation error: ${error.message}`;
    }

    return data.translatedText || text;
  } catch (error) {
    console.error('Translation request failed:', error);
    return `Translation failed: ${error.message}`;
  }
};

export function TranslationDemo() {
  const [inputText, setInputText] = useState("Hello, I'd like to book an appointment for tomorrow");
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedLang = languages.find(lang => lang.code === selectedLanguage);
  const isRTL = ['ar', 'he'].includes(selectedLanguage);

  // Filter languages based on search term
  const filteredLanguages = useMemo(() => {
    if (!searchTerm) return languages;
    return languages.filter(lang => 
      lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lang.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Debounced translation effect
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (inputText.trim()) {
        setIsTranslating(true);
        try {
          const result = await translateText(inputText, selectedLanguage);
          setTranslatedText(result);
        } catch (error) {
          setTranslatedText('Translation failed');
        } finally {
          setIsTranslating(false);
        }
      } else {
        setTranslatedText('');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inputText, selectedLanguage]);

  return (
    <div className="absolute inset-3 bg-slate-800/60 rounded-lg border border-slate-700/50 backdrop-blur-sm p-3">
      {/* Badge */}
      <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-medium">
        200+ Languages
      </div>

      <div className="h-full flex flex-col">
        {/* Side-by-side Layout */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          {/* Left Side - Input */}
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-medium">Enter text to translate:</label>
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your text here..."
              className="text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 h-8"
            />
          </div>

          {/* Right Side - Language Selection */}
          <div className="space-y-2">
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
              <SelectContent className="bg-slate-800 border-slate-700 max-h-48">
                {/* Search Input */}
                <div className="p-2 border-b border-slate-700">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search languages..."
                      className="pl-7 text-xs bg-slate-700 border-slate-600 text-white h-6"
                    />
                  </div>
                </div>
                
                {/* Popular Languages */}
                {!searchTerm && (
                  <div className="p-2 border-b border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Popular</div>
                    {languages.filter(lang => lang.popular).map((lang) => (
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
                  </div>
                )}
                
                {/* All Languages */}
                <div className="max-h-32 overflow-y-auto">
                  {filteredLanguages.map((lang) => (
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
                </div>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Translation Output */}
        <div className="mt-3 flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-300 font-medium">Translation:</label>
            {isTranslating && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Translating...</span>
              </div>
            )}
          </div>
          <div 
            className={`bg-slate-700/30 border border-slate-600/50 rounded p-3 text-xs text-white min-h-[50px] flex items-center ${isRTL ? 'text-right' : 'text-left'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {translatedText || (inputText ? 'Start typing to see translation...' : 'Enter text above to translate')}
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Live translation</span>
          </div>
          <div className="text-xs text-slate-400">
            Powered by LibreTranslate
          </div>
        </div>
      </div>
    </div>
  );
}