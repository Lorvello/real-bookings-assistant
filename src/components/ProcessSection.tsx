
import React, { useState } from 'react';
import WhatsAppChat from './WhatsAppChat';
import CalendarMockup from './CalendarMockup';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles } from 'lucide-react';
import StaggeredAnimationContainer from './StaggeredAnimationContainer';

const ProcessSection = () => {
  return (
    <section className="py-2 md:py-16 pt-16 md:pt-16 relative overflow-hidden" style={{
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
        <StaggeredAnimationContainer 
          staggerDelay={200} 
          threshold={0.3}
          variant="process"
          className="space-y-3 md:space-y-12"
        >
          {/* Section header - HEADERS (Largest) */}
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-white mb-6 md:mb-6 px-3 sm:px-0">
              See How It <span className="text-emerald-400">Works</span>
            </h2>
            <p className="text-xs md:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed px-3 sm:px-0 mb-12 md:mb-8">
              From first message to confirmed appointment in less than 30 seconds. 
              Watch how our AI handles the entire booking process automatically.
            </p>
          </div>

          {/* Step 1: WhatsApp Chat */}
          <div className="flex flex-col lg:flex-row items-center gap-3 md:gap-12 pt-2 md:pt-0">
            <div className="flex-1 space-y-4 md:space-y-6 text-center lg:text-left">
              <div className="flex items-center gap-2 md:gap-4 justify-center lg:justify-start">
                <div className="w-6 h-6 md:w-12 md:h-12 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-lg bg-gradient-to-br from-emerald-500 to-green-500">
                  1
                </div>
                <h3 className="text-lg md:text-2xl font-bold text-white">Customer Starts WhatsApp Chat</h3>
              </div>
              <p className="text-xs md:text-lg text-slate-300 leading-relaxed px-3 lg:px-0">
                Your customer sends a simple message expressing their need. Our AI agent 
                responds immediately with intelligent questions to understand their preferences 
                and find the perfect appointment time.
              </p>
            </div>
            
            <div className="flex-1 w-full max-w-[280px] md:max-w-sm lg:max-w-none flex justify-center lg:justify-start">
              <div className="h-[520px] w-full md:h-auto md:w-auto flex items-center justify-center py-1 md:py-0">
                <WhatsAppChat />
              </div>
            </div>
          </div>

          {/* Step 2: Calendar Result - Centered on mobile, left on desktop */}
          <div className="flex flex-col lg:flex-row-reverse items-start lg:items-center gap-3 md:gap-12 pt-2 md:pt-8">
            <div className="flex-1 space-y-4 md:space-y-6 text-center lg:text-left max-w-lg lg:max-w-none">
              <div className="flex items-center gap-2 md:gap-4 justify-center lg:justify-start">
                <div className="w-6 h-6 md:w-12 md:h-12 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-lg bg-gradient-to-br from-emerald-500 to-green-500 aspect-square">
                  2
                </div>
                <h3 className="text-lg md:text-2xl font-bold text-white">Appointment Automatically Booked</h3>
              </div>
               <p className="text-xs md:text-lg text-slate-300 leading-relaxed px-1 lg:px-0">
                 Integrate with your existing calendar system, or use our professional high-end calendar solution designed for optimal appointment management.
               </p>
             </div>
             
             {/* Calendar centered for mobile, right-aligned for desktop */}
             <div className="flex-1 w-full flex justify-center lg:justify-start">
               <div className="w-full max-w-[350px] md:max-w-[400px] lg:max-w-[520px] flex justify-center lg:justify-start">
                 <CalendarMockup />
               </div>
             </div>
          </div>

          {/* AI Agent Test Section */}
          <div className="space-y-2 md:space-y-8 pt-2 md:pt-8">
            <div className="text-center">
              <div className="flex items-center gap-2 md:gap-4 justify-center mb-4 md:mb-6">
                <div className="w-6 h-6 md:w-12 md:h-12 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-lg bg-gradient-to-br from-emerald-500 to-green-500">
                  3
                </div>
                <h3 className="text-lg md:text-2xl font-bold text-white">Test The AI Agent Yourself</h3>
              </div>
              <p className="text-xs md:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto mb-6 md:mb-8 px-3 sm:px-0">
                Try it yourself! Chat with our AI agent and experience how fast and natural 
                the booking process is. No registration required.
              </p>
            </div>
            
            <div className="flex justify-center mb-16 md:mb-0">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="default"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-lg md:text-base px-6 md:px-8 py-3 md:py-4 h-auto rounded-lg border border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                  >
                  <Bot className="mr-2 h-4 w-4 md:h-5 md:w-5 text-white" />
                  Try AI Agent Demo
                </Button>
              </DialogTrigger>
                {/* Significantly reduced modal size for mobile */}
                <DialogContent className="max-w-[85vw] w-[85vw] md:max-w-2xl md:w-full h-[60vh] md:h-[80vh] max-h-[400px] md:max-h-[600px] p-0 bg-slate-900 border-slate-700 data-[state=open]:animate-in data-[state=open]:fade-in-100 data-[state=open]:scale-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:scale-out-95 duration-300">
                  <DialogTitle className="sr-only">AI Agent Demo</DialogTitle>
                  <DialogDescription className="sr-only">
                    Test our AI booking agent in this demo chat interface
                  </DialogDescription>
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
