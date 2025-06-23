
import React from 'react';

const WhatsAppChat = () => {
  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Modern iPhone mockup with thinner bezels */}
      <div className="relative bg-gradient-to-b from-gray-800 to-black rounded-[3rem] p-1.5 shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] transition-all duration-500">
        {/* Phone screen with modern styling */}
        <div className="bg-white rounded-[2.5rem] overflow-hidden relative">
          {/* Refined iPhone notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-28 h-5 bg-black rounded-b-xl z-10 shadow-sm"></div>
          
          {/* Modern WhatsApp header with gradient */}
          <div className="bg-gradient-to-r from-whatsapp via-emerald-600 to-whatsapp text-white px-4 py-3.5 flex items-center gap-3 pt-7 shadow-lg">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center overflow-hidden shadow-md border border-white/30">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">🤖</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base tracking-tight">Beauty Salon AI</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse shadow-sm"></div>
                <p className="text-xs text-white/90 font-medium">online</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors p-1">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="opacity-90">
                  <path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7S3 6 3 9.7s3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.2zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z"/>
                </svg>
              </div>
              <div className="w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors p-1">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="opacity-90">
                  <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"/>
                </svg>
              </div>
            </div>
          </div>
          
          {/* Modern chat area with subtle pattern */}
          <div className="whatsapp-chat-bg min-h-[420px] p-4 space-y-4 relative">
            {/* Subtle background overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/[0.02] to-transparent"></div>

            {/* User message with modern styling */}
            <div className="flex justify-end relative z-10">
              <div className="whatsapp-bubble-user-modern max-w-[75%] group">
                <p className="text-white text-sm leading-relaxed font-medium">Hi! I'd like to book a haircut for tomorrow.</p>
                <div className="flex items-center justify-end gap-1.5 mt-2">
                  <span className="text-white/70 text-xs font-medium">10:30</span>
                  <div className="flex items-center">
                    <svg viewBox="0 0 16 15" width="12" height="12" className="text-white/80">
                      <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L3.724 9.587a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI response with modern styling */}
            <div className="flex justify-start relative z-10">
              <div className="whatsapp-bubble-ai-modern max-w-[75%] group">
                <p className="text-gray-800 text-sm leading-relaxed">Hi there! I'd be happy to help you book a haircut. What time works best for you tomorrow?</p>
                <div className="flex items-center justify-end mt-2">
                  <span className="text-gray-500 text-xs font-medium">10:30</span>
                </div>
              </div>
            </div>
            
            {/* User provides details */}
            <div className="flex justify-end relative z-10">
              <div className="whatsapp-bubble-user-modern max-w-[75%] group">
                <p className="text-white text-sm leading-relaxed font-medium">Around 2 PM would be perfect! Do you have any slots available?</p>
                <div className="flex items-center justify-end gap-1.5 mt-2">
                  <span className="text-white/70 text-xs font-medium">10:31</span>
                  <div className="flex items-center">
                    <svg viewBox="0 0 16 15" width="12" height="12" className="text-emerald-300">
                      <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L3.724 9.587a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Final AI confirmation */}
            <div className="flex justify-start relative z-10">
              <div className="whatsapp-bubble-ai-modern max-w-[75%] group">
                <p className="text-gray-800 text-sm leading-relaxed">Perfect! I have 2:00 PM available tomorrow. I'll book you with Sarah for a haircut. You'll receive a confirmation shortly! 💇‍♀️</p>
                <div className="flex items-center justify-end mt-2">
                  <span className="text-gray-500 text-xs font-medium">10:31</span>
                </div>
              </div>
            </div>
            
            {/* User thank you message */}
            <div className="flex justify-end relative z-10">
              <div className="whatsapp-bubble-user-modern max-w-[75%] group">
                <p className="text-white text-sm leading-relaxed font-medium">Thank you so much! See you tomorrow! 😊</p>
                <div className="flex items-center justify-end gap-1.5 mt-2">
                  <span className="text-white/70 text-xs font-medium">10:32</span>
                  <div className="flex items-center">
                    <svg viewBox="0 0 16 15" width="12" height="12" className="text-emerald-300">
                      <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L3.724 9.587a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Modern typing indicator */}
            <div className="flex justify-start relative z-10">
              <div className="whatsapp-typing-modern">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce shadow-sm"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Modern input area */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 flex items-center gap-3 border-t border-gray-200/50">
            <div className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.131 5.218 6.063 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.078 1.416-12.129 0-12.129 0zm11.363 1.108s-.669 1.959-5.051 1.959c-4.27 0-5.064-1.959-5.064-1.959s.201.543 5.064.543c4.865 0 5.051-.543 5.051-.543zm-2.635-9.066c-.711-.002-1.312.618-1.312 1.312s.601 1.312 1.312 1.312 1.312-.601 1.312-1.312-.601-1.312-1.312-1.312z"/>
              </svg>
            </div>
            <div className="flex-1 bg-white rounded-full px-4 py-2.5 shadow-sm border border-gray-200/70 hover:border-gray-300 transition-colors">
              <span className="text-gray-500 text-sm">Type a message</span>
            </div>
            <div className="w-6 h-6 text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
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
