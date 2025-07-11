
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Zap, Scissors, Stethoscope, Dumbbell } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-[60vh] md:min-h-screen overflow-hidden flex items-center justify-center" style={{
      backgroundImage: 'linear-gradient(to bottom, hsl(160, 84%, 39%) 0%, hsl(160, 84%, 39%) 20%, hsl(215, 28%, 10%) 25%, hsl(220, 39%, 4%) 100%)'
    }}>
      {/* Animated background elements - Optimized for mobile */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-emerald-400/3 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay - Reduced opacity on mobile */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.2)_1px,transparent_1px)] md:bg-[linear-gradient(rgba(15,23,42,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.4)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-30"></div>
      
      <div className="relative max-w-6xl mx-auto px-4 md:px-6 lg:px-8 text-center z-10">
        {/* Floating badge - Mobile optimized */}
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 md:px-6 md:py-3 mb-4 md:mb-8 animate-appear opacity-0">
          <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
          <span className="text-emerald-300 text-xs md:text-sm font-medium">AI-Powered Booking Revolution</span>
        </div>

        {/* Main headline - Mobile optimized typography */}
        <div className="space-y-4 md:space-y-8">
          <h1 className="text-2xl md:text-5xl xl:text-6xl 2xl:text-8xl font-extrabold text-white leading-tight md:leading-[0.95] tracking-tight animate-appear opacity-100">
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent relative">
              Bookings
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 blur-xl -z-10"></div>
            </span>
            {" "}on Auto Pilot
            <br />
            via WhatsApp
          </h1>

          <p className="text-sm md:text-xl lg:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed animate-appear opacity-100 delay-300 px-4 md:px-0">
            <span className="md:hidden">AI books appointments 24/7 via WhatsApp. Zero missed opportunities.</span>
            <span className="hidden md:inline">Your AI assistant books appointments through WhatsApp while you sleep.{" "}
            <span className="text-emerald-400 font-semibold">24/7 automation</span>,{" "}
            <span className="text-emerald-400 font-semibold">instant responses</span>,{" "}
            <span className="text-emerald-400 font-semibold">zero missed opportunities</span>.</span>
          </p>

          {/* CTA Section - Mobile optimized with proper touch targets */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-6 pt-6 md:pt-8 animate-appear opacity-100 delay-500 px-4 sm:px-0">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 md:px-8 py-3 md:py-6 text-base md:text-lg font-semibold rounded-xl shadow-lg shadow-emerald-500/25 border-0 transition-all duration-300 hover:scale-105 hover:shadow-emerald-500/40 group min-h-[48px]">
              <MessageCircle className="w-4 h-4 md:w-5 md:h-5 mr-2 group-hover:rotate-12 transition-transform" />
              Start Free 7-Day Trial
            </Button>
            
            <button className="w-full sm:w-auto text-slate-300 hover:text-white text-base md:text-lg font-medium flex items-center justify-center gap-2 group transition-colors min-h-[48px] px-4">
              <Zap className="w-4 h-4 md:w-5 md:h-5 group-hover:text-emerald-400 transition-colors" />
              See how it works
            </button>
          </div>

          {/* Social proof - Mobile optimized */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8 pt-6 md:pt-4 animate-appear opacity-100 delay-700 px-4 sm:px-0">
            <div className="flex items-center gap-3 md:gap-3">
              <div className="flex -space-x-1 md:-space-x-2">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-full border-2 border-slate-800 flex items-center justify-center">
                  <Scissors className="w-3 h-3 md:w-4 md:h-4 text-slate-700" />
                </div>
                <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-full border-2 border-slate-800 flex items-center justify-center">
                  <div className="w-3 h-3 md:w-4 md:h-4 bg-slate-700 rounded-t-full" style={{
                    clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)"
                  }}></div>
                </div>
                <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-full border-2 border-slate-800 flex items-center justify-center">
                  <Dumbbell className="w-3 h-3 md:w-4 md:h-4 text-slate-700" />
                </div>
                <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-full border-2 border-slate-800 flex items-center justify-center">
                  <Stethoscope className="w-3 h-3 md:w-4 md:h-4 text-slate-700" />
                </div>
              </div>
              <span className="text-slate-400 text-sm md:text-sm">1000+ businesses automated</span>
            </div>
            
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400 text-base md:text-lg">★</span>
              ))}
              <span className="text-slate-400 text-sm md:text-sm ml-2">4.9/5 rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade - Light transition */}
      <div className="absolute bottom-0 left-0 right-0 h-24 md:h-32 bg-gradient-to-t from-slate-800/60 via-slate-700/30 to-transparent"></div>
    </section>
  );
};

export default Hero;
