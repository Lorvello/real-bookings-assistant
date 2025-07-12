
import React, { useState } from 'react';
import WhatsAppChat from './WhatsAppChat';
import CalendarMockup from './CalendarMockup';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles } from 'lucide-react';

const ProcessSection = () => {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden" style={{
      backgroundColor: 'hsl(217, 35%, 12%)'
    }}>
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-6xl mx-auto relative z-10 px-4 md:px-6 lg:px-8">
        {/* Section header - Compact */}
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-xl md:text-5xl font-bold text-white mb-3 md:mb-6 px-3 sm:px-0">
            See How It Works
          </h2>
          <p className="text-xs md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed px-3 sm:px-0">
            From first message to confirmed appointment in less than 30 seconds. 
            Watch how our AI handles the entire booking process automatically.
          </p>
        </div>

        {/* Process flow - Increased mobile spacing */}
        <div className="space-y-32 md:space-y-16">
          {/* Step 1: WhatsApp Chat */}
          <div className="flex flex-col lg:flex-row items-center gap-4 md:gap-12 relative z-20">
            <div className="flex-1 space-y-3 md:space-y-6 text-center lg:text-left bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 md:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_35px_70px_-12px_rgba(0,0,0,0.9),0_0_40px_rgba(16,185,129,0.15)] transition-all duration-700">
              <div className="flex items-center gap-2 md:gap-4 justify-center lg:justify-start">
                <div className="w-6 h-6 md:w-12 md:h-12 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-lg bg-gradient-to-br from-emerald-500 to-green-500 shadow-[0_20px_40px_-8px_rgba(16,185,129,0.6),0_8px_16px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] border border-emerald-400/30">
                  1
                </div>
                <h3 className="text-sm md:text-2xl font-bold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">Customer Starts WhatsApp Chat</h3>
              </div>
              <p className="text-xs md:text-lg text-slate-300 leading-relaxed px-3 lg:px-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                Your customer sends a simple message expressing their need. Our AI agent 
                responds immediately with intelligent questions to understand their preferences 
                and find the perfect appointment time.
              </p>
            </div>
            
            <div className="flex-1 animate-appear opacity-100 delay-300 w-full max-w-[280px] md:max-w-sm lg:max-w-none relative z-30 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.9),0_18px_36px_-18px_rgba(0,0,0,0.7)] hover:shadow-[0_40px_80px_-12px_rgba(0,0,0,1),0_25px_50px_-18px_rgba(0,0,0,0.8)] transition-all duration-700">
              <WhatsAppChat />
            </div>
          </div>

          {/* Step 2: Calendar Result */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-4 md:gap-12 relative z-20">
            <div className="flex-1 space-y-3 md:space-y-6 text-center lg:text-left bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 md:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_35px_70px_-12px_rgba(0,0,0,0.9),0_0_40px_rgba(16,185,129,0.15)] transition-all duration-700">
              <div className="flex items-center gap-2 md:gap-4 justify-center lg:justify-start">
                <div className="w-6 h-6 md:w-12 md:h-12 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-lg bg-gradient-to-br from-emerald-500 to-green-500 shadow-[0_20px_40px_-8px_rgba(16,185,129,0.6),0_8px_16px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] border border-emerald-400/30">
                  2
                </div>
                <h3 className="text-sm md:text-2xl font-bold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">Appointment Automatically Booked</h3>
              </div>
              <p className="text-xs md:text-lg text-slate-300 leading-relaxed px-3 lg:px-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                Integrate with your existing calendar system, or use our professional high-end calendar solution designed for optimal appointment management.
              </p>
            </div>
            
            <div className="flex-1 animate-appear opacity-100 delay-700 w-full max-w-[280px] md:max-w-sm lg:max-w-none relative z-30 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.9),0_18px_36px_-18px_rgba(0,0,0,0.7)] hover:shadow-[0_40px_80px_-12px_rgba(0,0,0,1),0_25px_50px_-18px_rgba(0,0,0,0.8)] transition-all duration-700">
              <CalendarMockup />
            </div>
          </div>
        </div>

        {/* AI Agent Test Section - Increased top margin on mobile */}
        <div className="mt-32 md:mt-24 space-y-3 md:space-y-8 relative z-20">
          <div className="text-center bg-slate-800/30 backdrop-blur-xl border border-slate-700/40 rounded-3xl p-8 md:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_35px_70px_-12px_rgba(0,0,0,0.9),0_0_40px_rgba(16,185,129,0.15)] transition-all duration-700">
            <div className="flex items-center gap-2 md:gap-4 justify-center mb-3 md:mb-6">
              <div className="w-6 h-6 md:w-12 md:h-12 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-lg bg-gradient-to-br from-emerald-500 to-green-500 shadow-[0_20px_40px_-8px_rgba(16,185,129,0.6),0_8px_16px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] border border-emerald-400/30">
                3
              </div>
              <h3 className="text-sm md:text-2xl font-bold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">Test The AI Agent Yourself</h3>
            </div>
            <p className="text-xs md:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto mb-4 md:mb-8 px-3 sm:px-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
              Try it yourself! Chat with our AI agent and experience how fast and natural 
              the booking process is. No registration required.
            </p>
            
            <div className="flex justify-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="default"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm md:text-base px-6 md:px-8 py-3 md:py-4 h-auto rounded-lg border border-slate-700 shadow-[0_12px_24px_-6px_rgba(0,0,0,0.6),0_4px_8px_-2px_rgba(0,0,0,0.4)] hover:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.8),0_6px_12px_-2px_rgba(0,0,0,0.5)] transition-all duration-200 hover:scale-[1.02] relative z-30"
                  >
                    <Bot className="mr-2 h-4 w-4 md:h-5 md:w-5 text-white" />
                    Try AI Agent Demo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl w-full h-[80vh] max-h-[600px] p-0 bg-slate-900 border-slate-700 data-[state=open]:animate-in data-[state=open]:fade-in-100 data-[state=open]:scale-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:scale-out-95 duration-300 shadow-[0_40px_80px_-12px_rgba(0,0,0,1)]">
                  <AIAgentTestChat />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
