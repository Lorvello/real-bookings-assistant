
import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

const WhatsAppChat = () => {
  const { t } = useTranslation();
  
  return (
    <div className="w-full max-w-[280px] md:max-w-xs mx-auto">
      {/* Professional tablet-style interface for mobile, iPhone for desktop */}
      <div className="relative bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900 rounded-lg md:rounded-[2.5rem] p-1.5 md:p-1 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 aspect-[3/4] md:aspect-[9/17] border border-slate-600/40 md:border-none backdrop-blur-sm">
        {/* Tablet screen for mobile, phone screen for desktop */}
        <div className="bg-white rounded-md md:rounded-[2rem] overflow-hidden relative h-full shadow-inner flex flex-col">
          {/* No notch on mobile (tablet style), show notch on desktop (iPhone style) */}
          <div className="hidden md:block absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-4 bg-black rounded-b-xl z-10 shadow-sm"></div>
          
          {/* Enhanced WhatsApp header with better mobile styling */}
          <div className="bg-gradient-to-r from-whatsapp via-emerald-600 to-whatsapp text-white px-3 md:px-3 py-2 md:py-2.5 flex items-center gap-2 md:gap-2 pt-2 md:pt-5 shadow-lg flex-shrink-0">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center overflow-hidden shadow-md border border-white/30">
              <div className="w-5 h-5 md:w-6 md:h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs md:text-xs font-semibold">🤖</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm md:text-sm tracking-tight">{t('whatsappChat.businessName')}</h3>
              <div className="flex items-center gap-1 md:gap-1">
                <div className="w-1.5 h-1.5 md:w-1.5 md:h-1.5 bg-emerald-300 rounded-full animate-pulse shadow-sm"></div>
                <p className="text-xs md:text-xs text-white/90 font-medium">{t('whatsappChat.status')}</p>
              </div>
            </div>
            <div className="flex gap-2 md:gap-3">
              <div className="w-4 h-4 md:w-4 md:h-4 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
                <svg viewBox="0 0 24 24" width="14" height="14" className="md:w-3.5 md:h-3.5 opacity-90" fill="currentColor">
                  <path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7S3 6 3 9.7s3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.2zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z"/>
                </svg>
              </div>
              <div className="w-4 h-4 md:w-4 md:h-4 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
                <svg viewBox="0 0 24 24" width="14" height="14" className="md:w-3.5 md:h-3.5 opacity-90" fill="currentColor">
                  <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"/>
                </svg>
              </div>
            </div>
          </div>
          
          {/* Enhanced chat area - proper flex-1 to fill space */}
          <div className="whatsapp-chat-bg flex-1 p-2 md:p-3 space-y-1 md:space-y-3 relative overflow-y-auto">
            {/* Subtle background overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/[0.02] to-transparent"></div>

            {/* User message - smaller text for mobile */}
            <div className="flex justify-end relative z-10">
              <div className="whatsapp-bubble-user-modern max-w-[75%] group">
                <p className="text-white text-[7px] md:text-xs leading-tight md:leading-relaxed font-medium">{t('whatsappChat.conversation.userMessages.0')}</p>
                <div className="flex items-center justify-end gap-1 mt-1 md:mt-1">
                  <span className="text-white/70 text-[6px] md:text-xs font-medium">{t('whatsappChat.conversation.timestamps.0')}</span>
                  <div className="flex items-center">
                    <svg viewBox="0 0 16 15" width="8" height="8" className="md:w-2.5 md:h-2.5 text-white/80">
                      <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L3.724 9.587a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI response - smaller text for mobile */}
            <div className="flex justify-start relative z-10">
              <div className="whatsapp-bubble-ai-modern max-w-[75%] group">
                <p className="text-gray-800 text-[7px] md:text-xs leading-tight md:leading-relaxed">{t('whatsappChat.conversation.aiMessages.0')}</p>
                <div className="flex items-center justify-end mt-1 md:mt-1">
                  <span className="text-gray-500 text-[6px] md:text-xs font-medium">{t('whatsappChat.conversation.timestamps.1')}</span>
                </div>
              </div>
            </div>
            
            {/* User provides details - smaller text for mobile */}
            <div className="flex justify-end relative z-10">
              <div className="whatsapp-bubble-user-modern max-w-[75%] group">
                <p className="text-white text-[7px] md:text-xs leading-tight md:leading-relaxed font-medium">{t('whatsappChat.conversation.userMessages.1')}</p>
                <div className="flex items-center justify-end gap-1 mt-1 md:mt-1">
                  <span className="text-white/70 text-[6px] md:text-xs font-medium">{t('whatsappChat.conversation.timestamps.2')}</span>
                  <div className="flex items-center">
                    <svg viewBox="0 0 16 15" width="8" height="8" className="md:w-2.5 md:h-2.5 text-emerald-300">
                      <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L3.724 9.587a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Final AI confirmation - smaller text for mobile */}
            <div className="flex justify-start relative z-10">
              <div className="whatsapp-bubble-ai-modern max-w-[75%] group">
                <p className="text-gray-800 text-[7px] md:text-xs leading-tight md:leading-relaxed">{t('whatsappChat.conversation.aiMessages.1')}</p>
                <div className="flex items-center justify-end mt-1 md:mt-1">
                  <span className="text-gray-500 text-[6px] md:text-xs font-medium">{t('whatsappChat.conversation.timestamps.3')}</span>
                </div>
              </div>
            </div>

            {/* Enhanced typing indicator */}
            <div className="flex justify-start relative z-10">
              <div className="whatsapp-typing-modern">
                <div className="flex gap-1 md:gap-1">
                  <div className="w-1.5 h-1.5 md:w-1.5 md:h-1.5 bg-gray-400 rounded-full animate-bounce shadow-sm"></div>
                  <div className="w-1.5 h-1.5 md:w-1.5 md:h-1.5 bg-gray-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 md:w-1.5 md:h-1.5 bg-gray-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced input area - flex-shrink-0 to prevent shrinking */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 md:px-3 py-2 md:py-2 flex items-center gap-2 md:gap-2 border-t border-gray-200/50 flex-shrink-0">
            <div className="w-4 h-4 md:w-5 md:h-5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <svg viewBox="0 0 24 24" width="14" height="14" className="md:w-4 md:h-4" fill="currentColor">
                <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.131 5.218 6.063 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.078 1.416-12.129 0-12.129 0zm11.363 1.108s-.669 1.959-5.051 1.959c-4.27 0-5.064-1.959-5.064-1.959s.201.543 5.064.543c4.865 0 5.051-.543 5.051-.543zm-2.635-9.066c-.711-.002-1.312.618-1.312 1.312s.601 1.312 1.312 1.312 1.312-.601 1.312-1.312-.601-1.312-1.312-1.312z"/>
              </svg>
            </div>
            <div className="flex-1 bg-white rounded-full px-3 md:px-3 py-1.5 md:py-1.5 shadow-sm border border-gray-200/70 hover:border-gray-300 transition-colors">
              <span className="text-gray-500 text-xs md:text-xs">{t('whatsappChat.placeholder')}</span>
            </div>
            <div className="w-4 h-4 md:w-5 md:h-5 text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer">
              <svg viewBox="0 0 24 24" width="14" height="14" className="md:w-4 md:h-4" fill="currentColor">
                <path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.35 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2.001z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppChat;
