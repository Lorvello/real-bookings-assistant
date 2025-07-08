
import React from 'react';
import { Sparkles, Calendar } from 'lucide-react';
import WhatsAppChat from './WhatsAppChat';
import CalendarMockup from './CalendarMockup';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';

const ProcessSection = () => {
  return (
    <section className="space-golden-md bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Enhanced background with luxury depth */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-breathe"></div>
        <div className="absolute bottom-20 right-10 w-[32rem] h-[32rem] bg-blue-500/8 rounded-full blur-3xl animate-breathe delay-luxury-2"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-purple-400/6 rounded-full blur-3xl"></div>
      </div>
      
      {/* Premium grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.06)_1px,transparent_1px)] bg-[size:80px_80px] opacity-25"></div>
      
      <div className="container-luxury relative z-10">
        {/* Luxury section header */}
        <div className="text-center space-golden-sm">
          <h2 className="text-3xl md:text-5xl xl:text-6xl font-black text-white breathe-sm text-balance reading-width-wide">
            See How It Works
          </h2>
          <p className="text-lg md:text-xl text-slate-300 reading-width leading-relaxed font-light text-pretty">
            From first message to confirmed appointment in less than 30 seconds. 
            Watch how our AI handles the entire booking process automatically.
          </p>
        </div>

        {/* Enhanced process flow with timeline connector */}
        <div className="relative">
          {/* Timeline connector line - Desktop only */}
          <div className="hidden lg:block absolute left-1/2 top-24 bottom-24 w-1 bg-gradient-to-b from-emerald-400/30 via-blue-400/30 to-purple-400/30 rounded-full transform -translate-x-1/2 z-0"></div>
          
          <div className="space-y-golden-md relative z-10">
            {/* Step 1: WhatsApp Chat with floating number */}
            <div className="flex flex-col lg:flex-row items-center gap-golden-lg relative">
              {/* Floating process number with luxury glow */}
              <div className="absolute -top-8 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 z-20">
                <div className="relative">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-luxury-lg animate-fade-in-luxury">
                    <span className="text-white text-xl md:text-2xl font-black">1</span>
                  </div>
                  <div className="absolute inset-0 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full opacity-30 blur-xl animate-breathe"></div>
                </div>
              </div>
              
              <div className="flex-1 space-golden-sm text-center lg:text-left animate-fade-in-luxury delay-luxury-1">
                <div className="glass-subtle rounded-3xl p-8 md:p-10 shadow-luxury-md">
                  <h3 className="text-2xl md:text-4xl font-bold text-white mb-4 md:mb-6">Customer Starts WhatsApp Chat</h3>
                  <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-6 md:mb-8">
                    Your customer sends a simple message expressing their need. Our AI agent 
                    responds immediately with intelligent questions to understand their preferences 
                    and find the perfect appointment time.
                  </p>
                  <div className="glass-effect rounded-2xl p-4 md:p-6">
                    <p className="font-semibold text-emerald-400 text-base md:text-lg flex items-center justify-center lg:justify-start gap-2">
                      <Sparkles className="w-5 h-5" />
                      No apps to download, no complex forms to fill out
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 animate-fade-in-luxury delay-luxury-2">
                <div className="glass-subtle rounded-3xl p-6 shadow-luxury-lg">
                  <WhatsAppChat />
                </div>
              </div>
            </div>

            {/* Step 2: Calendar Result with enhanced styling */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-8 md:gap-16 relative">
              {/* Floating process number */}
              <div className="absolute -top-8 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 z-20">
                <div className="relative">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-luxury-lg animate-fade-in-luxury delay-luxury-2">
                    <span className="text-white text-xl md:text-2xl font-black">2</span>
                  </div>
                  <div className="absolute inset-0 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full opacity-30 blur-xl animate-breathe delay-luxury-1"></div>
                </div>
              </div>
              
              <div className="flex-1 space-y-6 md:space-y-8 text-center lg:text-left animate-fade-in-luxury delay-luxury-3">
                <div className="glass-subtle rounded-3xl p-8 md:p-10 shadow-luxury-md">
                  <h3 className="text-2xl md:text-4xl font-bold text-white mb-4 md:mb-6">Appointment Automatically Booked</h3>
                  <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-6 md:mb-8">
                    The AI confirms the appointment details and adds it directly to your calendar. 
                    Both you and your customer receive confirmation messages with all details.
                  </p>
                  <div className="glass-effect rounded-2xl p-4 md:p-6">
                    <p className="font-semibold text-blue-400 text-base md:text-lg flex items-center justify-center lg:justify-start gap-2">
                      <Calendar className="w-5 h-5" />
                      Syncs with Google Calendar, Outlook and more
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 animate-fade-in-luxury delay-luxury-4">
                <div className="glass-subtle rounded-3xl p-6 shadow-luxury-lg">
                  <CalendarMockup />
                </div>
              </div>
            </div>

            {/* Step 3: AI Agent Test with premium styling - REDUCED SPACING */}
            <div className="relative animate-fade-in-luxury delay-luxury-5">
              {/* Floating process number */}
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                <div className="relative">
                  <div className="w-14 h-14 md:w-18 md:h-18 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-luxury-lg">
                    <span className="text-white text-lg md:text-xl font-black">3</span>
                  </div>
                  <div className="absolute inset-0 w-14 h-14 md:w-18 md:h-18 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full opacity-30 blur-xl animate-breathe delay-luxury-2"></div>
                </div>
              </div>
              
              <div className="text-center breathe-sm pt-8">
                <h3 className="text-lg md:text-2xl font-bold text-white breathe-sm">Test The AI Agent Yourself</h3>
                <p className="text-sm md:text-base text-slate-300 leading-relaxed reading-width mx-auto">
                  Try it yourself! Chat with our AI agent and experience how fast and natural 
                  the booking process is. No registration required.
                </p>
              </div>
              
              <div className="glass-subtle rounded-3xl p-4 md:p-8 shadow-luxury-xl">
                <AIAgentTestChat />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
