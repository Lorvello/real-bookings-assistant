
import React, { useState } from 'react';
import WhatsAppChat from './WhatsAppChat';
import CalendarMockup from './CalendarMockup';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles } from 'lucide-react';
import StaggeredAnimationContainer from './StaggeredAnimationContainer';

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
        <StaggeredAnimationContainer staggerDelay={200} className="space-y-32 md:space-y-24">
          {/* Section header - Compact */}
          <div className="text-center">
            <h2 className="text-xl md:text-5xl font-bold text-white mb-3 md:mb-6 px-3 sm:px-0">
              See How It Works
            </h2>
            <p className="text-xs md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed px-3 sm:px-0">
              From first message to confirmed appointment in less than 30 seconds. 
              Watch how our AI handles the entire booking process automatically.
            </p>
          </div>

          {/* Step 1: WhatsApp Chat */}
          <div className="flex flex-col lg:flex-row items-center gap-4 md:gap-12">
            <div className="flex-1 space-y-3 md:space-y-6 text-center lg:text-left">
              <div className="flex items-center gap-2 md:gap-4 justify-center lg:justify-start">
                <div className="w-6 h-6 md:w-12 md:h-12 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-lg bg-gradient-to-br from-emerald-500 to-green-500">
                  1
                </div>
                <h3 className="text-sm md:text-2xl font-bold text-white">Customer Starts WhatsApp Chat</h3>
              </div>
              <p className="text-xs md:text-lg text-slate-300 leading-relaxed px-3 lg:px-0">
                Your customer sends a simple message expressing their need. Our AI agent 
                responds immediately with intelligent questions to understand their preferences 
                and find the perfect appointment time.
              </p>
            </div>
            
            <div className="flex-1 w-full max-w-[280px] md:max-w-sm lg:max-w-none">
              <WhatsAppChat />
            </div>
          </div>

          {/* Step 2: Calendar Result */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-4 md:gap-12">
            <div className="flex-1 space-y-3 md:space-y-6 text-center lg:text-left">
              <div className="flex items-center gap-2 md:gap-4 justify-center lg:justify-start">
                <div className="w-6 h-6 md:w-12 md:h-12 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-lg bg-gradient-to-br from-emerald-500 to-green-500">
                  2
                </div>
                <h3 className="text-sm md:text-2xl font-bold text-white">Appointment Automatically Booked</h3>
              </div>
               <p className="text-xs md:text-lg text-slate-300 leading-relaxed px-3 lg:px-0">
                 Integrate with your existing calendar system, or use our professional high-end calendar solution designed for optimal appointment management.
               </p>
            </div>
            
            <div className="flex-1 w-full max-w-[280px] md:max-w-sm lg:max-w-none">
              <CalendarMockup />
            </div>
          </div>

          {/* AI Agent Test Section */}
          <div className="space-y-3 md:space-y-8">
            <div className="text-center">
              <div className="flex items-center gap-2 md:gap-4 justify-center mb-3 md:mb-6">
                <div className="w-6 h-6 md:w-12 md:h-12 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-lg bg-gradient-to-br from-emerald-500 to-green-500">
                  3
                </div>
                <h3 className="text-sm md:text-2xl font-bold text-white">Test The AI Agent Yourself</h3>
              </div>
              <p className="text-xs md:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto mb-4 md:mb-8 px-3 sm:px-0">
                Try it yourself! Chat with our AI agent and experience how fast and natural 
                the booking process is. No registration required.
              </p>
            </div>
            
            <div className="flex justify-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="default"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm md:text-base px-6 md:px-8 py-3 md:py-4 h-auto rounded-lg border border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                  >
                  <Bot className="mr-2 h-4 w-4 md:h-5 md:w-5 text-white" />
                  Try AI Agent Demo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl w-full h-[80vh] max-h-[600px] p-0 bg-slate-900 border-slate-700 data-[state=open]:animate-in data-[state=open]:fade-in-100 data-[state=open]:scale-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:scale-out-95 duration-300">
                <AIAgentTestChat />
              </DialogContent>
              </Dialog>
            </div>
          </div>
        </StaggeredAnimationContainer>
      </div>
    </section>
  );
};

export default ProcessSection;
