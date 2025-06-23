
import React from 'react';

const WhatsAppChat = () => {
  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Realistic iPhone mockup container */}
      <div className="relative bg-black rounded-[2.5rem] p-2 shadow-2xl transform hover:scale-105 transition-all duration-300">
        {/* Phone screen with notch */}
        <div className="bg-white rounded-[2rem] overflow-hidden relative">
          {/* iPhone notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10"></div>
          
          {/* WhatsApp header with authentic styling */}
          <div className="bg-whatsapp text-white px-4 py-3 flex items-center gap-3 pt-8">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden shadow-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">🤖</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Beauty Salon AI</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-xs text-white/90">online</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7S3 6 3 9.7s3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.2zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z"/>
                </svg>
              </div>
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"/>
                </svg>
              </div>
            </div>
          </div>
          
          {/* Chat messages with WhatsApp background pattern */}
          <div className="whatsapp-chat-bg min-h-[400px] p-3 space-y-3 relative">
            {/* Background pattern overlay */}
            <div className="absolute inset-0 opacity-5">
              <div className="w-full h-full" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}></div>
            </div>

            {/* User message */}
            <div className="flex justify-end relative z-10">
              <div className="whatsapp-bubble-user max-w-[280px]">
                <p className="text-white text-sm leading-relaxed">Hi! I'd like to book a haircut for tomorrow.</p>
                <div className="flex items-center justify-end gap-1 mt-2">
                  <span className="text-white/70 text-xs">10:30</span>
                  <div className="flex items-center">
                    <svg viewBox="0 0 16 15" width="12" height="12" className="text-white/70">
                      <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L3.724 9.587a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI response */}
            <div className="flex justify-start relative z-10">
              <div className="whatsapp-bubble-ai max-w-[280px]">
                <p className="text-gray-800 text-sm leading-relaxed">Hi there! I'd be happy to help you book a haircut. What time works best for you tomorrow?</p>
                <div className="flex items-center justify-end mt-2">
                  <span className="text-gray-500 text-xs">10:30</span>
                </div>
              </div>
            </div>
            
            {/* User provides details */}
            <div className="flex justify-end relative z-10">
              <div className="whatsapp-bubble-user max-w-[280px]">
                <p className="text-white text-sm leading-relaxed">Around 2 PM would be perfect! Do you have any slots available?</p>
                <div className="flex items-center justify-end gap-1 mt-2">
                  <span className="text-white/70 text-xs">10:31</span>
                  <div className="flex items-center">
                    <svg viewBox="0 0 16 15" width="12" height="12" className="text-blue-400">
                      <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L3.724 9.587a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Final AI confirmation */}
            <div className="flex justify-start relative z-10">
              <div className="whatsapp-bubble-ai max-w-[280px]">
                <p className="text-gray-800 text-sm leading-relaxed">Perfect! I have 2:00 PM available tomorrow. I'll book you with Sarah for a haircut. You'll receive a confirmation shortly! 💇‍♀️</p>
                <div className="flex items-center justify-end mt-2">
                  <span className="text-gray-500 text-xs">10:31</span>
                </div>
              </div>
            </div>
            
            {/* User thank you message */}
            <div className="flex justify-end relative z-10">
              <div className="whatsapp-bubble-user max-w-[280px]">
                <p className="text-white text-sm leading-relaxed">Thank you so much! See you tomorrow! 😊</p>
                <div className="flex items-center justify-end gap-1 mt-2">
                  <span className="text-white/70 text-xs">10:32</span>
                  <div className="flex items-center">
                    <svg viewBox="0 0 16 15" width="12" height="12" className="text-blue-400">
                      <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L3.724 9.587a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Typing indicator (optional animation) */}
            <div className="flex justify-start relative z-10">
              <div className="whatsapp-bubble-ai max-w-[80px] flex items-center justify-center py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp input area */}
          <div className="bg-gray-100 px-3 py-2 flex items-center gap-3">
            <div className="w-6 h-6 text-gray-500">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.131 5.218 6.063 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.078 1.416-12.129 0-12.129 0zm11.363 1.108s-.669 1.959-5.051 1.959c-4.27 0-5.064-1.959-5.064-1.959s.201.543 5.064.543c4.865 0 5.051-.543 5.051-.543zm-2.635-9.066c-.711-.002-1.312.618-1.312 1.312s.601 1.312 1.312 1.312 1.312-.601 1.312-1.312-.601-1.312-1.312-1.312z"/>
              </svg>
            </div>
            <div className="flex-1 bg-white rounded-full px-4 py-2">
              <span className="text-gray-500 text-sm">Type a message</span>
            </div>
            <div className="w-6 h-6 text-gray-500">
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
