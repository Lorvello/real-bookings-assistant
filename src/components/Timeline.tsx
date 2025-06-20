
import React from 'react';
import { ArrowRight, MessageCircle, Calendar } from 'lucide-react';

const Timeline = () => {
  return (
    <section className="bg-secondary py-section px-6">
      <div className="max-w-6xl mx-auto">
        {/* Timeline Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From first contact to confirmed appointment in seconds
          </p>
        </div>

        {/* Timeline Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/80 transform -translate-y-1/2 hidden lg:block"></div>
          
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center max-w-sm relative">
              {/* Icon Container */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg shadow-primary/25 relative z-10">
                  <MessageCircle className="w-10 h-10 text-primary-foreground" strokeWidth={2} />
                </div>
                {/* Glow Effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-primary/20 rounded-full blur opacity-75"></div>
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-3">
                Start WhatsApp Chat
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Customer sends a simple message to your WhatsApp number. Our AI agent responds instantly with available times.
              </p>
              
              {/* Step Number */}
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center lg:mx-8">
              <ArrowRight className="w-8 h-8 text-primary transform rotate-90 lg:rotate-0" strokeWidth={2} />
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center max-w-sm relative">
              {/* Icon Container */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg shadow-primary/25 relative z-10">
                  <Calendar className="w-10 h-10 text-primary-foreground" strokeWidth={2} />
                </div>
                {/* Glow Effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-primary/20 rounded-full blur opacity-75"></div>
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-3">
                Appointment Booked in Calendar
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                AI confirms the booking, adds it to your calendar, and sends confirmation to both you and your customer.
              </p>
              
              {/* Step Number */}
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
            </div>
          </div>
        </div>

        {/* Connecting Arrow to Calendar */}
        <div className="flex justify-center mt-12">
          <div className="flex flex-col items-center">
            <div className="w-px h-8 bg-gradient-to-b from-primary to-primary/80"></div>
            <ArrowRight className="w-6 h-6 text-primary transform rotate-90" strokeWidth={2} />
            <p className="text-sm text-muted-foreground mt-2 font-medium">See it in action</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Timeline;
