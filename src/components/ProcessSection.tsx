
import React from 'react';
import WhatsAppChat from './WhatsAppChat';
import CalendarMockup from './CalendarMockup';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';

const ProcessSection = () => {
  return (
    <section className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 px-4 sm:px-0">
            See How It Works
          </h2>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
            From first message to confirmed appointment in less than 30 seconds. 
            Watch how our AI handles the entire booking process automatically.
          </p>
        </div>

        {/* Process flow */}
        <div className="space-y-12 sm:space-y-16">
          {/* Step 1: WhatsApp Chat */}
          <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12">
            <div className="flex-1 space-y-4 sm:space-y-6 text-center lg:text-left">
              <div className="flex items-center gap-4 justify-center lg:justify-start">
                <div className="w-10 h-10 sm:w-12 sm:h-12 text-white rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-br from-emerald-500 to-green-500">
                  1
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">Customer Starts WhatsApp Chat</h3>
              </div>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed px-4 lg:px-0">
                Your customer sends a simple message expressing their need. Our AI agent 
                responds immediately with intelligent questions to understand their preferences 
                and find the perfect appointment time.
              </p>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 backdrop-blur-sm mx-4 lg:mx-0">
                <p className="font-medium text-emerald-400 text-sm sm:text-base">✨ No apps to download, no complex forms to fill out</p>
              </div>
            </div>
            
            <div className="flex-1 animate-appear opacity-100 delay-300 w-full max-w-md lg:max-w-none">
              <WhatsAppChat />
            </div>
          </div>

          {/* Step 2: Calendar Result */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-8 sm:gap-12">
            <div className="flex-1 space-y-4 sm:space-y-6 text-center lg:text-left">
              <div className="flex items-center gap-4 justify-center lg:justify-start">
                <div className="w-10 h-10 sm:w-12 sm:h-12 text-white rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                  2
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">Appointment Automatically Booked</h3>
              </div>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed px-4 lg:px-0">
                The AI confirms the appointment details and adds it directly to your calendar. 
                Both you and your customer receive confirmation messages with all details.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 backdrop-blur-sm mx-4 lg:mx-0">
                <p className="font-medium text-blue-400 text-sm sm:text-base">📅 Syncs with Google Calendar, Outlook and more</p>
              </div>
            </div>
            
            <div className="flex-1 animate-appear opacity-100 delay-700 w-full max-w-md lg:max-w-none">
              <CalendarMockup />
            </div>
          </div>
        </div>

        {/* AI Agent Test Section */}
        <div className="mt-16 sm:mt-20 space-y-4 sm:space-y-6">
          <div className="text-center">
            <div className="flex items-center gap-4 justify-center mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 text-white rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-br from-purple-500 to-pink-500">
                3
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Test The AI Agent Yourself</h3>
            </div>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto mb-4 sm:mb-6 px-4 sm:px-0">
              Try it yourself! Chat with our AI agent and experience how fast and natural 
              the booking process is. No registration required.
            </p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-3 sm:p-6 mx-4 sm:mx-0">
            <AIAgentTestChat />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
