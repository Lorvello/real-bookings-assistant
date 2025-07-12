
import React, { useState, useEffect, useRef } from 'react';
import WhatsAppChat from './WhatsAppChat';
import CalendarMockup from './CalendarMockup';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles } from 'lucide-react';

const ProcessSection = () => {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers = stepRefs.current.map((ref, index) => {
      if (!ref) return null;
      
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleSteps(prev => [...prev, index].filter((v, i, a) => a.indexOf(v) === i));
          }
        },
        { threshold: 0.3, rootMargin: '-50px' }
      );
      
      observer.observe(ref);
      return observer;
    });

    return () => {
      observers.forEach(observer => observer?.disconnect());
    };
  }, []);

  return (
    <section className="py-24 md:py-32 relative overflow-hidden" style={{
      backgroundColor: 'hsl(217, 35%, 12%)'
    }}>
      {/* Enhanced background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-80 h-80 bg-slate-600/8 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-slate-600/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Enhanced grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.08)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30"></div>
      
      <div className="max-w-7xl mx-auto relative z-10 px-6 md:px-8 lg:px-12">
        {/* Enhanced section header */}
        <div className="text-center mb-16 md:mb-24">
          <h2 className="text-2xl md:text-6xl font-bold text-white mb-4 md:mb-8 px-3 sm:px-0 leading-tight">
            See How It Works
          </h2>
          <p className="text-base md:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed px-3 sm:px-0 font-light">
            From first message to confirmed appointment in less than 30 seconds. 
            Watch how our AI handles the entire booking process automatically.
          </p>
        </div>

        {/* Process flow - Premium depth treatment */}
        <div className="space-y-40 md:space-y-32">
          {/* Step 1: WhatsApp Chat */}
          <div 
            ref={el => stepRefs.current[0] = el}
            className={`flex flex-col lg:flex-row items-center gap-12 md:gap-20 transition-all duration-1000 ${
              visibleSteps.includes(0) ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-12'
            }`}
          >
            <div className="flex-1 space-y-8 md:space-y-10 text-center lg:text-left">
              {/* Premium elevated content card */}
              <div className="bg-slate-800/40 backdrop-blur-lg rounded-3xl p-8 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.15)] border border-slate-600/40 hover:shadow-[0_25px_80px_rgba(0,0,0,0.5)] transition-all duration-500">
                <div className="flex items-center gap-4 md:gap-8 justify-center lg:justify-start mb-6 md:mb-8">
                  <div className="w-12 h-12 md:w-20 md:h-20 text-white rounded-full flex items-center justify-center font-bold text-lg md:text-2xl bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 shadow-[0_12px_32px_rgba(15,23,42,0.4),0_4px_12px_rgba(15,23,42,0.3),inset_0_2px_4px_rgba(255,255,255,0.1)] border border-slate-500/30 hover:shadow-[0_16px_40px_rgba(15,23,42,0.5)] transition-all duration-300">
                    1
                  </div>
                  <h3 className="text-xl md:text-4xl font-bold text-white drop-shadow-lg">Customer Starts WhatsApp Chat</h3>
                </div>
                <p className="text-base md:text-xl text-slate-200 leading-relaxed px-3 lg:px-0 font-light">
                  Your customer sends a simple message expressing their need. Our AI agent 
                  responds immediately with intelligent questions to understand their preferences 
                  and find the perfect appointment time.
                </p>
              </div>
            </div>
            
            <div className="flex-1 w-full max-w-[320px] md:max-w-xl lg:max-w-none">
              <div className="shadow-[0_30px_80px_rgba(0,0,0,0.5),0_12px_32px_rgba(0,0,0,0.35)] transform hover:scale-[1.03] transition-all duration-500 hover:shadow-[0_40px_100px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden">
                <WhatsAppChat />
              </div>
            </div>
          </div>

          {/* Step 2: Calendar Result */}
          <div 
            ref={el => stepRefs.current[1] = el}
            className={`flex flex-col lg:flex-row-reverse items-center gap-12 md:gap-20 transition-all duration-1000 delay-200 ${
              visibleSteps.includes(1) ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-12'
            }`}
          >
            <div className="flex-1 space-y-8 md:space-y-10 text-center lg:text-left">
              {/* Premium elevated content card */}
              <div className="bg-slate-800/40 backdrop-blur-lg rounded-3xl p-8 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.15)] border border-slate-600/40 hover:shadow-[0_25px_80px_rgba(0,0,0,0.5)] transition-all duration-500">
                <div className="flex items-center gap-4 md:gap-8 justify-center lg:justify-start mb-6 md:mb-8">
                  <div className="w-12 h-12 md:w-20 md:h-20 text-white rounded-full flex items-center justify-center font-bold text-lg md:text-2xl bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 shadow-[0_12px_32px_rgba(15,23,42,0.4),0_4px_12px_rgba(15,23,42,0.3),inset_0_2px_4px_rgba(255,255,255,0.1)] border border-slate-500/30 hover:shadow-[0_16px_40px_rgba(15,23,42,0.5)] transition-all duration-300">
                    2
                  </div>
                  <h3 className="text-xl md:text-4xl font-bold text-white drop-shadow-lg">Appointment Automatically Booked</h3>
                </div>
                <p className="text-base md:text-xl text-slate-200 leading-relaxed px-3 lg:px-0 font-light">
                  Integrate with your existing calendar system, or use our professional high-end calendar solution designed for optimal appointment management.
                </p>
              </div>
            </div>
            
            <div className="flex-1 w-full max-w-[320px] md:max-w-xl lg:max-w-none">
              <div className="shadow-[0_30px_80px_rgba(0,0,0,0.5),0_12px_32px_rgba(0,0,0,0.35)] transform hover:scale-[1.03] transition-all duration-500 hover:shadow-[0_40px_100px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden">
                <CalendarMockup />
              </div>
            </div>
          </div>
        </div>

        {/* AI Agent Test Section - Premium treatment */}
        <div 
          ref={el => stepRefs.current[2] = el}
          className={`mt-40 md:mt-32 space-y-8 md:space-y-16 transition-all duration-1000 delay-400 ${
            visibleSteps.includes(2) ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-12'
          }`}
        >
          <div className="text-center">
            {/* Premium elevated content card */}
            <div className="bg-slate-800/40 backdrop-blur-lg rounded-3xl p-10 md:p-16 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.15)] border border-slate-600/40 max-w-5xl mx-auto hover:shadow-[0_25px_80px_rgba(0,0,0,0.5)] transition-all duration-500">
              <div className="flex items-center gap-4 md:gap-8 justify-center mb-8 md:mb-12">
                <div className="w-12 h-12 md:w-20 md:h-20 text-white rounded-full flex items-center justify-center font-bold text-lg md:text-2xl bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 shadow-[0_12px_32px_rgba(15,23,42,0.4),0_4px_12px_rgba(15,23,42,0.3),inset_0_2px_4px_rgba(255,255,255,0.1)] border border-slate-500/30 hover:shadow-[0_16px_40px_rgba(15,23,42,0.5)] transition-all duration-300">
                  3
                </div>
                <h3 className="text-xl md:text-4xl font-bold text-white drop-shadow-lg">Test The AI Agent Yourself</h3>
              </div>
              <p className="text-base md:text-xl text-slate-200 leading-relaxed max-w-4xl mx-auto mb-10 md:mb-16 px-3 sm:px-0 font-light">
                Try it yourself! Chat with our AI agent and experience how fast and natural 
                the booking process is. No registration required.
              </p>
              
              <div className="flex justify-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="default"
                      className="bg-slate-900 hover:bg-black text-white font-semibold text-base md:text-xl px-10 md:px-16 py-5 md:py-7 h-auto rounded-2xl border border-slate-700 shadow-[0_16px_40px_rgba(0,0,0,0.4),0_6px_16px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_8px_20px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-[1.05] hover:-translate-y-2 active:scale-[0.98]"
                    >
                      <Bot className="mr-4 h-6 w-6 md:h-7 md:w-7 text-white" />
                      Try AI Agent Demo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl w-full h-[80vh] max-h-[600px] p-0 bg-slate-900 border-slate-700 data-[state=open]:animate-in data-[state=open]:fade-in-100 data-[state=open]:scale-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:scale-out-95 duration-300 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
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
