import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Zap, Scissors, Stethoscope, Dumbbell } from "lucide-react";
import { DottedSurface } from "@/components/ui/dotted-surface";

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  
  const handleStartTrial = () => {
    navigate('/signup');
  };
  
  const handleHowItWorks = () => {
    navigate('/how-it-works');
  };
  
  return (
    <section className="relative min-h-[130vh] overflow-hidden flex items-center justify-center -mt-24 md:mt-0 md:pt-24">
      {/* 3D Dotted Surface Background - extends into next section */}
      <DottedSurface className="absolute -top-[10vh] left-0 right-0 h-[140vh]" />
      
      {/* Subtle radial gradient overlay for depth */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,23,42,0.3)_100%)] pointer-events-none"
      ></div>
      
      {/* Fade out gradient at bottom for smooth transition */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-[hsl(217,35%,12%)]/50 to-[hsl(217,35%,12%)] pointer-events-none z-10"></div>
      
      <div className="relative max-w-6xl mx-auto px-4 md:px-6 lg:px-8 text-center z-10">
        {/* Floating badge - SUBTEXT */}
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 md:px-6 md:py-3 mb-2 md:mb-8 animate-appear opacity-0">
          <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
          <span className="text-emerald-300 text-xs md:text-sm font-garamond font-light">AI-Powered Booking Revolution</span>
        </div>

        {/* Main headline - HEADER (Largest) */}
        <div className="space-y-2 md:space-y-8">
        <h1 className="text-4xl md:text-6xl xl:text-7xl font-light text-white leading-tight md:leading-[0.95] tracking-tighter opacity-100">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-emerald-200 via-emerald-400 to-emerald-600 biolum-text font-normal">
              Bookings
            </span>
            <span className="text-white/90">{" "}on Auto Pilot</span>
            <br />
            <span className="font-serif italic font-normal text-emerald-400 biolum-text">via WhatsApp</span>
          </h1>

          <p className="text-sm md:text-xl text-slate-400 max-w-4xl mx-auto leading-relaxed animate-appear opacity-100 delay-300 px-4 md:px-0 mb-6 md:mb-0 font-garamond font-light">
            <span className="md:hidden">AI Books Appointments, Zero Missed Opportunities</span>
            <span className="hidden md:inline">Your AI assistant books appointments through WhatsApp while you sleep.{" "}
            <span className="text-emerald-400 biolum-text-subtle">24/7 automation</span>,{" "}
            <span className="text-emerald-400 biolum-text-subtle">instant responses</span>,{" "}
            <span className="text-emerald-400 biolum-text-subtle">zero missed opportunities</span>.</span>
          </p>

          {/* CTA Section - BUTTONS (Medium-Large) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-6 pt-6 md:pt-8 animate-appear opacity-100 delay-500 px-4 sm:px-0">
            <Button 
              onClick={handleStartTrial}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-4 py-2 md:px-8 md:py-6 text-sm md:text-lg font-semibold rounded-xl shadow-lg shadow-emerald-500/25 border-0 transition-all duration-300 hover:scale-105 hover:shadow-emerald-500/40 group min-h-[40px] md:min-h-[48px]"
            >
              <MessageCircle className="w-4 h-4 md:w-5 md:h-5 mr-2 group-hover:rotate-12 transition-transform" />
              Start Free 30-Day Trial
            </Button>
            
            <button 
              onClick={handleHowItWorks}
              className="w-full sm:w-auto text-slate-300 hover:text-white text-sm md:text-lg font-medium flex items-center justify-center gap-2 group transition-colors min-h-[40px] md:min-h-[48px] px-4"
            >
              <Zap className="w-4 h-4 md:w-5 md:h-5 group-hover:text-emerald-400 transition-colors" />
              See how it works
            </button>
          </div>

          {/* Social proof - SUBTEXT (Smallest) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-8 pt-1 md:pt-4 animate-appear opacity-100 delay-700 px-4 sm:px-0 mb-2 md:mb-0">
            <div className="flex items-center gap-1.5 md:gap-3">
              <div className="flex -space-x-1 md:-space-x-2">
                <div className="w-3 h-3 md:w-8 md:h-8 bg-white rounded-full border-1 md:border-2 border-slate-800 flex items-center justify-center">
                  <Scissors className="w-1.5 h-1.5 md:w-4 md:h-4 text-slate-700" />
                </div>
                <div className="w-3 h-3 md:w-8 md:h-8 bg-white rounded-full border-1 md:border-2 border-slate-800 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 md:w-4 md:h-4 bg-slate-700 rounded-t-full" style={{
                    clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)"
                  }}></div>
                </div>
                <div className="w-3 h-3 md:w-8 md:h-8 bg-white rounded-full border-1 md:border-2 border-slate-800 flex items-center justify-center">
                  <Dumbbell className="w-1.5 h-1.5 md:w-4 md:h-4 text-slate-700" />
                </div>
                <div className="w-3 h-3 md:w-8 md:h-8 bg-white rounded-full border-1 md:border-2 border-slate-800 flex items-center justify-center">
                  <Stethoscope className="w-1.5 h-1.5 md:w-4 md:h-4 text-slate-700" />
                </div>
              </div>
              <span className="text-slate-400 text-xs md:text-sm font-garamond font-light">1000+ businesses automated</span>
            </div>
            
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400 text-xs md:text-lg">★</span>
              ))}
              <span className="text-slate-400 text-xs md:text-sm ml-1 font-garamond font-light">4.9/5 rating</span>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default HeroSection;