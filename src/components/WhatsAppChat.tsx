
import React from 'react';

const WhatsAppChat = () => {
  return (
    <div className="w-full max-w-[200px] md:max-w-xs mx-auto">
      {/* Much smaller iPhone mockup for mobile */}
      <div className="relative bg-gradient-to-b from-gray-800 to-black rounded-[1.8rem] md:rounded-[2.5rem] p-0.5 md:p-1 shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] transition-all duration-500">
        {/* Phone screen with very compact styling */}
        <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] overflow-hidden relative">
          {/* Much smaller iPhone notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-2.5 md:w-20 md:h-4 bg-black rounded-b-xl z-10 shadow-sm"></div>
          
          {/* Much more compact WhatsApp header */}
          <div className="bg-gradient-to-r from-whatsapp via-emerald-600 to-whatsapp text-white px-2 md:px-3 py-1.5 md:py-2.5 flex items-center gap-1.5 md:gap-2 pt-3 md:pt-5 shadow-lg">
            <div className="w-5 h-5 md:w-8 md:h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center overflow-hidden shadow-md border border-white/30">
              <div className="w-4 h-4 md:w-6 md:h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white text-[8px] md:text-xs font-semibold">🤖</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[10px] md:text-sm tracking-tight">Beauty Salon AI</h3>
              <div className="flex items-center gap-0.5 md:gap-1">
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-emerald-300 rounded-full animate-pulse shadow-sm"></div>
                <p className="text-[8px] md:text-xs text-white/90 font-medium">online</p>
              </div>
            </div>
            <div className="flex gap-2 md:gap-3">
              <div className="w-3 h-3 md:w-4 md:h-4 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
                <svg viewBox="0 0 24 24" width="10" height="10" className="md:w-3.5 md:h-3.5 opacity-90" fill="currentColor">
                  <path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7S3 6 3 9.7s3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.2zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z"/>
                </svg>
              </div>
              <div className="w-3 h-3 md:w-4 md:h-4 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
                <svg viewBox="0 0 24 24" width="10" height="10" className="md:w-3.5 md:h-3.5 opacity-90" fill="currentColor">
                  <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"/>
                </svg>
              </div>
            </div>
          </div>
          
          {/* Much smaller chat area */}
          <div className="whatsapp-chat-bg min-h-[180px] md:min-h-[280px] p-2 md:p-3 space-y-2 md:space-y-3 relative">
            {/* Subtle background overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/[0.02] to-transparent"></div>

            {/* User message - much more compact */}
            <div className="flex justify-end relative z-10">
              <div className="whatsapp-bubble-user-modern max-w-[75%] group">
                <p className="text-white text-[9px] md:text-xs leading-relaxed font-medium">Hi! I'd like to book a haircut for tomorrow.</p>
                <div className="flex items-center justify-end gap-1 mt-0.5 md:mt-1">
                  <span className="text-white/70 text-[8px] md:text-xs font-medium">10:30</span>
                  <div className="flex items-center">
                    <svg viewBox="0 0 16 15" width="7" height="7" className="md:w-2.5 md:h-2.5 text-white/80">
                      <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L3.724 9.587a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI response - much more compact */}
            <div className="flex justify-start relative z-10">
              <div className="whatsapp-bubble-ai-modern max-w-[75%] group">
                <p className="text-gray-800 text-[9px] md:text-xs leading-relaxed">Hi! I'd be happy to help. What time works best for you tomorrow?</p>
                <div className="flex items-center justify-end mt-0.5 md:mt-1">
                  <span className="text-gray-500 text-[8px] md:text-xs font-medium">10:30</span>
                </div>
              </div>
            </div>
            
            {/* User provides details - much more compact */}
            <div className="flex justify-end relative z-10">
              <div className="whatsapp-bubble-user-modern max-w-[75%] group">
                <p className="text-white text-[9px] md:text-xs leading-relaxed font-medium">Around 2 PM would be perfect!</p>
                <div className="flex items-center justify-end gap-1 mt-0.5 md:mt-1">
                  <span className="text-white/70 text-[8px] md:text-xs font-medium">10:31</span>
                  <div className="flex items-center">
                    <svg viewBox="0 0 16 15" width="7" height="7" className="md:w-2.5 md:h-2.5 text-emerald-300">
                      <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L3.724 9.587a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Final AI confirmation - much more compact */}
            <div className="flex justify-start relative z-10">
              <div className="whatsapp-bubble-ai-modern max-w-[75%] group">
                <p className="text-gray-800 text-[9px] md:text-xs leading-relaxed">Perfect! I have 2:00 PM available. You'll receive confirmation shortly! 💇‍♀️</p>
                <div className="flex items-center justify-end mt-0.5 md:mt-1">
                  <span className="text-gray-500 text-[8px] md:text-xs font-medium">10:31</span>
                </div>
              </div>
            </div>

            {/* Much smaller typing indicator */}
            <div className="flex justify-start relative z-10">
              <div className="whatsapp-typing-modern">
                <div className="flex gap-0.5 md:gap-1">
                  <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-gray-400 rounded-full animate-bounce shadow-sm"></div>
                  <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-gray-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-gray-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Much more compact input area */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-2 md:px-3 py-1.5 md:py-2 flex items-center gap-1.5 md:gap-2 border-t border-gray-200/50">
            <div className="w-3 h-3 md:w-5 md:h-5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <svg viewBox="0 0 24 24" width="10" height="10" className="md:w-4 md:h-4" fill="currentColor">
                <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.131 5.218 6.063 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.078 1.416-12.129 0-12.129 0zm11.363 1.108s-.669 1.959-5.051 1.959c-4.27 0-5.064-1.959-5.064-1.959s.201.543 5.064.543c4.865 0 5.051-.543 5.051-.543zm-2.635-9.066c-.711-.002-1.312.618-1.312 1.312s.601 1.312 1.312 1.312 1.312-.601 1.312-1.312-.601-1.312-1.312-1.312z"/>
              </svg>
            </div>
            <div className="flex-1 bg-white rounded-full px-2 md:px-3 py-1 md:py-1.5 shadow-sm border border-gray-200/70 hover:border-gray-300 transition-colors">
              <span className="text-gray-500 text-[9px] md:text-xs">Type a message</span>
            </div>
            <div className="w-3 h-3 md:w-5 md:h-5 text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer">
              <svg viewBox="0 0 24 24" width="10" height="10" className="md:w-4 md:h-4" fill="currentColor">
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
