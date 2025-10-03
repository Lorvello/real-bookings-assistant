
import React from 'react';
import { ArrowRight, MessageCircle, Calendar } from 'lucide-react';

const Timeline = () => {
  return (
    <section className="bg-slate-100 py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Timeline Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            From first contact to confirmed appointment in seconds
          </p>
        </div>

        {/* Timeline Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-500 transform -translate-y-1/2 hidden lg:block"></div>
          
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center max-w-sm relative">
              {/* Icon Container */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/25 relative z-10">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>
                {/* Glow Effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full blur opacity-75"></div>
              </div>
              
              <h3 className="text-xl font-bold text-black mb-3">
                Start WhatsApp Chat
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Customer sends a simple message to your WhatsApp number. Our AI agent responds instantly with available times.
              </p>
              
              {/* Step Number */}
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center lg:mx-8">
              <ArrowRight className="w-8 h-8 text-green-500 transform rotate-90 lg:rotate-0" />
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center max-w-sm relative">
              {/* Icon Container */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/25 relative z-10">
                  <Calendar className="w-10 h-10 text-white" />
                </div>
                {/* Glow Effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full blur opacity-75"></div>
              </div>
              
              <h3 className="text-xl font-bold text-black mb-3">
                Appointment Booked in Calendar
              </h3>
              <p className="text-gray-700 leading-relaxed">
                AI confirms the booking, adds it to your calendar, and sends confirmation to both you and your customer.
              </p>
              
              {/* Step Number */}
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
            </div>
          </div>
        </div>

        {/* Connecting Arrow to Calendar */}
        <div className="flex justify-center mt-12">
          <div className="flex flex-col items-center">
            <div className="w-px h-8 bg-gradient-to-b from-green-500 to-emerald-500"></div>
            <ArrowRight className="w-6 h-6 text-green-500 transform rotate-90" />
            <p className="text-sm text-gray-600 mt-2 font-medium">See it in action</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Timeline;
