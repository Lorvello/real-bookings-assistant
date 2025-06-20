
import React from 'react';

const WhatsAppChat = () => {
  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Phone mockup container */}
      <div className="relative bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
        {/* Phone screen */}
        <div className="bg-background rounded-[2rem] overflow-hidden border border-border">
          {/* WhatsApp header */}
          <div className="bg-whatsapp text-white px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xs">🤖</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Beauty Salon</h3>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <p className="text-xs text-white/80">Online</p>
              </div>
            </div>
          </div>
          
          {/* Chat messages */}
          <div className="bg-background min-h-[400px] p-3 space-y-3">
            {/* User message */}
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-[80%] shadow-sm">
                <p className="text-sm">Hi! I'd like to book a haircut.</p>
                <p className="text-xs text-primary-foreground/70 mt-1">10:30</p>
              </div>
            </div>
            
            {/* AI response */}
            <div className="flex justify-start">
              <div className="bg-muted text-foreground p-3 rounded-lg max-w-[80%] shadow-sm">
                <p className="text-sm">Sure! What day and time works best for you?</p>
                <p className="text-xs text-muted-foreground mt-1">10:30</p>
              </div>
            </div>
            
            {/* User provides full details */}
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-[80%] shadow-sm">
                <p className="text-sm">Tuesday May 20th at 10 a.m.</p>
                <p className="text-xs text-primary-foreground/70 mt-1">10:31</p>
              </div>
            </div>
            
            {/* Final AI confirmation */}
            <div className="flex justify-start">
              <div className="bg-muted text-foreground p-3 rounded-lg max-w-[80%] shadow-sm">
                <p className="text-sm">Perfect! You're booked for Tuesday, May 20th at 10:00 AM with Lisa. I'll send you a confirmation.</p>
                <p className="text-xs text-muted-foreground mt-1">10:31</p>
              </div>
            </div>
            
            {/* User thank you message */}
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-[80%] shadow-sm">
                <p className="text-sm">Thank you!</p>
                <p className="text-xs text-primary-foreground/70 mt-1">10:32</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppChat;
