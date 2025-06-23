
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Zap, Scissors, Stethoscope, Dumbbell } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 overflow-hidden flex items-center justify-center">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-400/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.4)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 text-center z-10">
        {/* Floating badge */}
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-6 py-3 mb-8 animate-appear opacity-0">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-300 text-sm font-medium">AI-Powered Booking Revolution</span>
        </div>

        {/* Main headline - RESTORED */}
        <div className="space-y-8">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[0.9] tracking-tight animate-appear opacity-100">
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent relative">
              Bookings
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 blur-xl -z-10"></div>
            </span>
            {" "}on Auto Pilot
            <br />
            via WhatsApp
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed animate-appear opacity-100 delay-300">
            Your AI assistant books appointments through WhatsApp while you sleep.{" "}
            <span className="text-emerald-400 font-semibold">24/7 automation</span>,{" "}
            <span className="text-emerald-400 font-semibold">instant responses</span>,{" "}
            <span className="text-emerald-400 font-semibold">zero missed opportunities</span>.
          </p>

          {/* CTA Section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 animate-appear opacity-100 delay-500">
            <Button className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-emerald-500/25 border-0 transition-all duration-300 hover:scale-105 hover:shadow-emerald-500/40 group">
              <MessageCircle className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
              Start Free 7-Day Trial
            </Button>
            
            <button className="text-slate-300 hover:text-white text-lg font-medium flex items-center gap-2 group transition-colors">
              <Zap className="w-5 h-5 group-hover:text-emerald-400 transition-colors" />
              See how it works
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-8 pt-4 animate-appear opacity-100 delay-700">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {/* Hair salon/beauty - Scissors */}
                <div className="w-8 h-8 bg-white rounded-full border-2 border-slate-800 flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-slate-700" />
                </div>
                
                {/* Dental clinic - Custom tooth shape */}
                <div className="w-8 h-8 bg-white rounded-full border-2 border-slate-800 flex items-center justify-center">
                  <div className="w-4 h-4 bg-slate-700 rounded-t-full" style={{
                    clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)"
                  }}></div>
                </div>
                
                {/* Fitness/gym - Dumbbell */}
                <div className="w-8 h-8 bg-white rounded-full border-2 border-slate-800 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-slate-700" />
                </div>
                
                {/* Medical/healthcare - Stethoscope */}
                <div className="w-8 h-8 bg-white rounded-full border-2 border-slate-800 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-slate-700" />
                </div>
              </div>
              <span className="text-slate-400 text-sm">1000+ businesses automated</span>
            </div>
            
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400 text-lg">★</span>
              ))}
              <span className="text-slate-400 text-sm ml-2">4.9/5 rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent"></div>
    </section>
  );
};

export default Hero;
