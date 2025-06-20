
import React from 'react';

const WhatsAppChat = () => {
  return (
    <div className="w-full max-w-xs mx-auto">
      {/* Phone mockup container */}
      <div className="relative bg-muted rounded-[2rem] p-2 shadow-2xl">
        {/* Phone screen */}
        <div className="bg-background rounded-[1.5rem] overflow-hidden border border-border">
          {/* WhatsApp header */}
          <div className="bg-whatsapp text-white px-3 py-2.5 flex items-center gap-2">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xs">🤖</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-xs">Beauty Salon</h3>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <p className="text-xs text-white/80">Online</p>
              </div>
            </div>
          </div>
          
          {/* Chat messages */}
          <div className="bg-background min-h-[320px] p-2.5 space-y-2">
            {/* User message */}
            <div className="flex justify-end">
              <div className="bg-whatsapp text-white p-2.5 rounded-lg max-w-[75%] shadow-sm">
                <p className="text-xs">Hi! I'd like to book a haircut.</p>
                <p className="text-xs text-white/70 mt-1">10:30</p>
              </div>
            </div>
            
            {/* AI response */}
            <div className="flex justify-start">
              <div className="bg-secondary text-foreground p-2.5 rounded-lg max-w-[75%] shadow-sm">
                <p className="text-xs">Sure! What day and time works best for you?</p>
                <p className="text-xs text-muted-foreground mt-1">10:30</p>
              </div>
            </div>
            
            {/* User provides full details */}
            <div className="flex justify-end">
              <div className="bg-whatsapp text-white p-2.5 rounded-lg max-w-[75%] shadow-sm">
                <p className="text-xs">Tuesday May 20th at 10 a.m.</p>
                <p className="text-xs text-white/70 mt-1">10:31</p>
              </div>
            </div>
            
            {/* Final AI confirmation */}
            <div className="flex justify-start">
              <div className="bg-secondary text-foreground p-2.5 rounded-lg max-w-[75%] shadow-sm">
                <p className="text-xs">Perfect! You're booked for Tuesday, May 20th at 10:00 AM with Lisa. I'll send you a confirmation.</p>
                <p className="text-xs text-muted-foreground mt-1">10:31</p>
              </div>
            </div>
            
            {/* User thank you message */}
            <div className="flex justify-end">
              <div className="bg-whatsapp text-white p-2.5 rounded-lg max-w-[75%] shadow-sm">
                <p className="text-xs">Thank you!</p>
                <p className="text-xs text-white/70 mt-1">10:32</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppChat;
