
import React from 'react';
import WhatsAppChat from './WhatsAppChat';
import CalendarMockup from './CalendarMockup';

const ProcessSection = () => {
  return (
    <section className="bg-secondary py-20 px-4 border-t border-border">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            See How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            From first message to confirmed appointment in under 30 seconds. 
            Watch our AI handle the entire booking process automatically.
          </p>
        </div>

        {/* Process flow */}
        <div className="space-y-16">
          {/* Step 1: WhatsApp Chat */}
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 text-foreground rounded-full flex items-center justify-center font-bold text-lg bg-primary">
                  1
                </div>
                <h3 className="text-2xl font-bold text-foreground">Customer Starts WhatsApp Chat</h3>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Your customer sends a simple message expressing their need. Our AI agent 
                instantly responds with intelligent questions to understand their preferences 
                and find the perfect appointment time.
              </p>
              <div className="bg-whatsapp/10 border border-whatsapp/20 rounded-lg p-4">
                <p className="font-medium text-whatsapp">✨ No apps to download, no complex forms to fill</p>
              </div>
            </div>
            
            <div className="flex-1 animate-appear opacity-0 delay-300">
              <WhatsAppChat />
            </div>
          </div>

          {/* Step 2: Calendar Result */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 text-foreground rounded-full flex items-center justify-center font-bold text-lg bg-primary">
                  2
                </div>
                <h3 className="text-2xl font-bold text-foreground">Appointment Automatically Booked</h3>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                The AI confirms the appointment details and instantly adds it to your calendar. 
                Both you and your customer receive confirmation messages with all the details.
              </p>
              <div className="bg-whatsapp/10 border border-whatsapp/20 rounded-lg p-4">
                <p className="font-medium text-whatsapp">📅 Syncs with Google Calendar, Outlook, and more</p>
              </div>
            </div>
            
            <div className="flex-1 animate-appear opacity-0 delay-700">
              <CalendarMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
