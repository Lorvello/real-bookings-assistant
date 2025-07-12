
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

        {/* Process flow - Enhanced depth treatment */}
        <div className="space-y-48 md:space-y-24">
          {/* Step 1: WhatsApp Chat */}
          <div className="flex flex-col lg:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 space-y-6 md:space-y-8 text-center lg:text-left">
              {/* Elevated content card */}
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] border border-slate-700/50">
                <div className="flex items-center gap-3 md:gap-6 justify-center lg:justify-start mb-4">
                  <div className="w-8 h-8 md:w-16 md:h-16 text-white rounded-full flex items-center justify-center font-bold text-sm md:text-xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-green-500 shadow-[0_8px_24px_rgba(16,185,129,0.3),0_2px_8px_rgba(16,185,129,0.2),inset_0_1px_2px_rgba(255,255,255,0.2)] border border-emerald-400/30">
                    1
                  </div>
                  <h3 className="text-base md:text-3xl font-bold text-white drop-shadow-sm">Customer Starts WhatsApp Chat</h3>
                </div>
                <p className="text-sm md:text-xl text-slate-300 leading-relaxed px-3 lg:px-0">
                  Your customer sends a simple message expressing their need. Our AI agent 
                  responds immediately with intelligent questions to understand their preferences 
                  and find the perfect appointment time.
                </p>
              </div>
            </div>
            
            <div className="flex-1 animate-appear opacity-100 delay-300 w-full max-w-[300px] md:max-w-lg lg:max-w-none">
              <div className="shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)] transform hover:scale-[1.02] transition-transform duration-300">
                <WhatsAppChat />
              </div>
            </div>
          </div>

          {/* Step 2: Calendar Result */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-8 md:gap-16">
            <div className="flex-1 space-y-6 md:space-y-8 text-center lg:text-left">
              {/* Elevated content card */}
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] border border-slate-700/50">
                <div className="flex items-center gap-3 md:gap-6 justify-center lg:justify-start mb-4">
                  <div className="w-8 h-8 md:w-16 md:h-16 text-white rounded-full flex items-center justify-center font-bold text-sm md:text-xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-green-500 shadow-[0_8px_24px_rgba(16,185,129,0.3),0_2px_8px_rgba(16,185,129,0.2),inset_0_1px_2px_rgba(255,255,255,0.2)] border border-emerald-400/30">
                    2
                  </div>
                  <h3 className="text-base md:text-3xl font-bold text-white drop-shadow-sm">Appointment Automatically Booked</h3>
                </div>
                <p className="text-sm md:text-xl text-slate-300 leading-relaxed px-3 lg:px-0">
                  Integrate with your existing calendar system, or use our professional high-end calendar solution designed for optimal appointment management.
                </p>
              </div>
            </div>
            
            <div className="flex-1 animate-appear opacity-100 delay-700 w-full max-w-[300px] md:max-w-lg lg:max-w-none">
              <div className="shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)] transform hover:scale-[1.02] transition-transform duration-300">
                <CalendarMockup />
              </div>
            </div>
          </div>
        </div>

        {/* AI Agent Test Section - Enhanced depth treatment */}
        <div className="mt-48 md:mt-32 space-y-6 md:space-y-12">
          <div className="text-center">
            {/* Elevated content card */}
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] border border-slate-700/50 max-w-4xl mx-auto">
              <div className="flex items-center gap-3 md:gap-6 justify-center mb-6 md:mb-8">
                <div className="w-8 h-8 md:w-16 md:h-16 text-white rounded-full flex items-center justify-center font-bold text-sm md:text-xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-green-500 shadow-[0_8px_24px_rgba(16,185,129,0.3),0_2px_8px_rgba(16,185,129,0.2),inset_0_1px_2px_rgba(255,255,255,0.2)] border border-emerald-400/30">
                  3
                </div>
                <h3 className="text-base md:text-3xl font-bold text-white drop-shadow-sm">Test The AI Agent Yourself</h3>
              </div>
              <p className="text-sm md:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto mb-8 md:mb-12 px-3 sm:px-0">
                Try it yourself! Chat with our AI agent and experience how fast and natural 
                the booking process is. No registration required.
              </p>
              
              <div className="flex justify-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="default"
                      className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm md:text-lg px-8 md:px-12 py-4 md:py-6 h-auto rounded-xl border border-slate-600 shadow-[0_8px_24px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-300 hover:scale-[1.05] hover:-translate-y-1"
                    >
                      <Bot className="mr-3 h-5 w-5 md:h-6 md:w-6 text-white" />
                      Try AI Agent Demo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl w-full h-[80vh] max-h-[600px] p-0 bg-slate-900 border-slate-700 data-[state=open]:animate-in data-[state=open]:fade-in-100 data-[state=open]:scale-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:scale-out-95 duration-300 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                    <AIAgentTestChat />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
