
import React from 'react';

const WhatsAppChat = () => {
  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Phone mockup container */}
      <div className="relative bg-black rounded-[2.5rem] p-2 shadow-2xl">
        {/* Phone screen */}
        <div className="bg-white rounded-[2rem] overflow-hidden">
          {/* WhatsApp header */}
          <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-xs text-gray-600">🤖</span>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm">Beauty Salon AI</h3>
              <p className="text-xs text-green-200">Online</p>
            </div>
          </div>
          
          {/* Chat messages */}
          <div className="bg-[#e5ddd5] min-h-[400px] p-3 space-y-2">
            {/* User message */}
            <div className="flex justify-end">
              <div className="bg-[#dcf8c6] rounded-lg px-3 py-2 max-w-[80%] shadow-sm">
                <p className="text-sm text-gray-800">Hi, I'd like to book a haircut</p>
                <p className="text-xs text-gray-500 mt-1">10:30</p>
              </div>
            </div>
            
            {/* AI response */}
            <div className="flex justify-start">
              <div className="bg-white rounded-lg px-3 py-2 max-w-[80%] shadow-sm">
                <p className="text-sm text-gray-800">Sure! What day and time works best for you?</p>
                <p className="text-xs text-gray-500 mt-1">10:30</p>
              </div>
            </div>
            
            {/* User provides full details */}
            <div className="flex justify-end">
              <div className="bg-[#dcf8c6] rounded-lg px-3 py-2 max-w-[80%] shadow-sm">
                <p className="text-sm text-gray-800">Monday morning at 10 a.m.</p>
                <p className="text-xs text-gray-500 mt-1">10:31</p>
              </div>
            </div>
            
            {/* Final AI confirmation */}
            <div className="flex justify-start">
              <div className="bg-white rounded-lg px-3 py-2 max-w-[80%] shadow-sm">
                <p className="text-sm text-gray-800">Perfect! You're booked for Monday at 10:00 AM. I'll send you a confirmation.</p>
                <p className="text-xs text-gray-500 mt-1">10:31</p>
              </div>
            </div>
            
            {/* User thank you message */}
            <div className="flex justify-end">
              <div className="bg-[#dcf8c6] rounded-lg px-3 py-2 max-w-[80%] shadow-sm">
                <p className="text-sm text-gray-800">Thank you! See you Monday 😊</p>
                <p className="text-xs text-gray-500 mt-1">10:32</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppChat;
