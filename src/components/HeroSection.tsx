import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Zap, Scissors, Stethoscope, Dumbbell } from "lucide-react";
import BioluminescentBackground from "@/components/effects/BioluminescentBackground";
import { NoodleConnections } from "@/components/NoodleConnections";
import ParticleCanvas from "@/components/effects/ParticleCanvas";

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
      {/* Noodle SVG Connections */}
      <NoodleConnections />
      
      {/* Bioluminescent Background */}
      <BioluminescentBackground />
      
      {/* Particle Canvas */}
      <ParticleCanvas />
      
      {/* Radial Emerald Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] pointer-events-none"></div>
      
      {/* Fade out gradient at bottom for smooth transition */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-[hsl(217,35%,12%)]/50 to-[hsl(217,35%,12%)] pointer-events-none z-10"></div>
      
      <div className="relative max-w-6xl mx-auto px-4 md:px-6 lg:px-8 text-center z-10">
        {/* Floating badge - SUBTEXT */}
        <div className="animate-drift" style={{ animationDelay: '0ms' }}>
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2 md:px-6 md:py-3 mb-2 md:mb-8 backdrop-blur-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 text-xs md:text-sm font-medium tracking-wide">AI-Powered Booking Revolution</span>
          </div>
        </div>

        {/* Main headline - HEADER (Largest) */}
        <div className="space-y-2 md:space-y-8">
          <h1 className="animate-drift delay-100 text-3xl md:text-5xl xl:text-7xl font-light text-white leading-tight md:leading-[0.95] tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-emerald-200 via-emerald-400 to-emerald-600 biolum-text font-normal">
              Bookings
            </span>
            <span className="text-white/90"> on Auto Pilot</span>
            <br />
            <span className="font-serif italic font-normal text-emerald-400 biolum-text">via WhatsApp</span>
          </h1>

          <p className="animate-drift delay-200 text-xs md:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed px-4 md:px-0 mb-6 md:mb-0">
            <span className="md:hidden">AI Books Appointments, Zero Missed Opportunities</span>
            <span className="hidden md:inline">Your AI assistant books appointments through WhatsApp while you sleep.{" "}
            <span className="text-emerald-400 font-semibold">24/7 automation</span>,{" "}
            <span className="text-emerald-400 font-semibold">instant responses</span>,{" "}
            <span className="text-emerald-400 font-semibold">zero missed opportunities</span>.</span>
          </p>

          {/* CTA Section - BUTTONS (Medium-Large) */}
          <div className="animate-drift delay-300 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 pt-6 md:pt-8 px-4 sm:px-0">
            <Button 
              onClick={handleStartTrial}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 py-3 md:px-8 md:py-4 text-sm md:text-base font-semibold rounded-full shadow-lg shadow-emerald-500/40 border-0 transition-all duration-300 hover:scale-105 hover:shadow-emerald-500/60 group min-h-[44px] md:min-h-[52px]"
            >
              <MessageCircle className="w-4 h-4 md:w-5 md:h-5 mr-2 group-hover:rotate-12 transition-transform" />
              Start Free 30-Day Trial
            </Button>
            
            <button 
              onClick={handleHowItWorks}
              className="w-full sm:w-auto text-emerald-400 hover:text-emerald-300 text-sm md:text-base font-medium flex items-center justify-center gap-2 group transition-all min-h-[44px] md:min-h-[52px] px-6 py-3 rounded-full border border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/10"
            >
              <Zap className="w-4 h-4 md:w-5 md:h-5 group-hover:text-emerald-300 transition-colors" />
              See how it works
            </button>
          </div>

          {/* Social proof - SUBTEXT (Smallest) */}
          <div className="animate-drift delay-500 flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 pt-6 md:pt-8 px-4 sm:px-0 mb-2 md:mb-0">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex -space-x-2 md:-space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full border-2 border-[hsl(217,35%,12%)] flex items-center justify-center">
                  <Scissors className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full border-2 border-[hsl(217,35%,12%)] flex items-center justify-center">
                  <div className="w-3 h-3 md:w-4 md:h-4 bg-white rounded-t-full" style={{
                    clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)"
                  }}></div>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full border-2 border-[hsl(217,35%,12%)] flex items-center justify-center">
                  <Dumbbell className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-emerald-300 to-emerald-500 rounded-full border-2 border-[hsl(217,35%,12%)] flex items-center justify-center">
                  <Stethoscope className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
              </div>
              <span className="text-slate-400 text-xs md:text-sm">1000+ businesses automated</span>
            </div>
            
            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-emerald-500/30"></div>
            
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400 text-sm md:text-lg">★</span>
              ))}
              <span className="text-slate-400 text-xs md:text-sm ml-1">4.9/5 rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="animate-drift delay-1000 absolute bottom-8 w-full flex justify-center">
        <div className="flex flex-col items-center gap-2 text-emerald-500/50">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-[1px] h-16 bg-gradient-to-b from-emerald-500/50 via-emerald-500/20 to-transparent animate-float"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
