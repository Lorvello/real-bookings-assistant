
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Zap, Scissors, Stethoscope, Dumbbell } from "lucide-react";
import { useCursorGradient, useMagneticHover } from "@/hooks/useCursorGradient";

const Hero = () => {
  const { ref: heroRef, className: cursorClassName } = useCursorGradient({
    enabled: true,
    intensity: 0.15
  });
  
  const { ref: ctaRef, className: magneticClassName } = useMagneticHover<HTMLButtonElement>(0.3);

  return (
    <section 
      ref={heroRef}
      className={`relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 overflow-hidden flex items-center justify-center ${cursorClassName}`}
    >
      {/* Enhanced animated background elements with multiple layers */}
      <div className="absolute inset-0">
        {/* Primary gradient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 md:w-96 md:h-96 bg-emerald-500/15 rounded-full blur-3xl animate-breathe"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 md:w-[28rem] md:h-[28rem] bg-green-500/12 rounded-full blur-3xl animate-breathe delay-luxury-3"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] md:w-[1000px] md:h-[1000px] bg-emerald-400/8 rounded-full blur-3xl"></div>
        
        {/* Secondary accent orbs */}
        <div className="absolute top-40 right-20 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-40 left-20 w-64 h-64 bg-cyan-400/8 rounded-full blur-2xl animate-float delay-1000"></div>
        
        {/* Luxury mesh gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-emerald-900/5 to-slate-900/20"></div>
      </div>
      
      {/* Refined grid pattern with depth */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.15)_1px,transparent_1px)] md:bg-[linear-gradient(rgba(15,23,42,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.2)_1px,transparent_1px)] bg-[size:40px_40px] md:bg-[size:80px_80px] opacity-40"></div>
      
      <div className="relative container-luxury text-center z-10">
        {/* Premium floating badge with glassmorphism */}
        <div className="inline-flex items-center gap-3 glass-effect rounded-full px-6 py-3 md:px-8 md:py-4 mb-8 md:mb-12 animate-fade-in-luxury shadow-luxury-sm hover:shadow-luxury-md transition-luxury">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
          <span className="text-emerald-300 text-sm md:text-base font-medium tracking-wide">AI-Powered Booking Revolution</span>
        </div>

        {/* Premium headline with enhanced typography */}
        <div className="space-luxury-sm">
          <h1 className="text-4xl md:text-6xl xl:text-7xl 2xl:text-8xl font-black text-white leading-[0.9] tracking-tight animate-fade-in-luxury delay-luxury-1 text-balance">
            <span className="bg-gradient-to-r from-emerald-300 via-green-400 to-teal-400 bg-clip-text text-transparent relative inline-block">
              Bookings
              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400/20 via-green-400/15 to-teal-400/20 blur-2xl -z-10 animate-breathe"></div>
            </span>
            {" "}on Auto Pilot
            <br />
            <span className="text-slate-100 font-light">via WhatsApp</span>
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed animate-fade-in-luxury delay-luxury-2 mt-8 md:mt-12 font-light text-pretty">
            <span className="md:hidden">AI books appointments 24/7 via WhatsApp. Zero missed opportunities.</span>
            <span className="hidden md:inline">Your AI assistant books appointments through WhatsApp while you sleep.{" "}
            <span className="text-emerald-400 font-medium">24/7 automation</span>,{" "}
            <span className="text-emerald-400 font-medium">instant responses</span>,{" "}
            <span className="text-emerald-400 font-medium">zero missed opportunities</span>.</span>
          </p>

          {/* Enhanced CTA Section with glassmorphism */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8 pt-12 md:pt-16 animate-fade-in-luxury delay-luxury-3">
            <Button 
              ref={ctaRef}
              className={`w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-8 md:px-10 py-4 md:py-6 text-lg md:text-xl font-semibold rounded-2xl shadow-luxury-lg shadow-emerald-500/25 border-0 transition-luxury hover-lift-context group min-h-[56px] md:min-h-[64px] ${magneticClassName}`}
            >
              <MessageCircle className="w-5 h-5 md:w-6 md:h-6 mr-3 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" />
              Start Free 7-Day Trial
            </Button>
            
            <button className="w-full sm:w-auto glass-subtle text-slate-300 hover:text-white text-lg md:text-xl font-medium flex items-center justify-center gap-3 group transition-luxury min-h-[56px] md:min-h-[64px] px-6 rounded-2xl hover:shadow-luxury-sm">
              <Zap className="w-5 h-5 md:w-6 md:h-6 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300" />
              See how it works
            </button>
          </div>

          {/* Enhanced social proof with luxury styling */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-12 pt-12 md:pt-16 animate-fade-in-luxury delay-luxury-4">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full border-2 border-slate-700 flex items-center justify-center shadow-luxury-sm">
                  <Scissors className="w-4 h-4 md:w-5 md:h-5 text-slate-700" />
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full border-2 border-slate-700 flex items-center justify-center shadow-luxury-sm">
                  <div className="w-4 h-4 md:w-5 md:h-5 bg-slate-700 rounded-t-full" style={{
                    clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)"
                  }}></div>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full border-2 border-slate-700 flex items-center justify-center shadow-luxury-sm">
                  <Dumbbell className="w-4 h-4 md:w-5 md:h-5 text-slate-700" />
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full border-2 border-slate-700 flex items-center justify-center shadow-luxury-sm">
                  <Stethoscope className="w-4 h-4 md:w-5 md:h-5 text-slate-700" />
                </div>
              </div>
              <span className="text-slate-400 text-base md:text-lg font-medium">1000+ businesses automated</span>
            </div>
            
            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400 text-xl md:text-2xl">★</span>
              ))}
              <span className="text-slate-400 text-base md:text-lg font-medium ml-3">4.9/5 rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced bottom fade with gradient mesh */}
      <div className="absolute bottom-0 left-0 right-0 h-32 md:h-40 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
    </section>
  );
};

export default Hero;
