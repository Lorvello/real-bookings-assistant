
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative min-h-screen bg-slate-900 overflow-hidden flex items-center justify-center">
      {/* Dark grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.8)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 text-center">
        {/* Main Content - Centered */}
        <div className="space-y-12">
          {/* Large Standalone Headline */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-tight tracking-tight">
            Your AI Appointment Agent –<br />
            Bookings on{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Auto-Pilot
            </span>
            , via{" "}
            <span className="text-green-400 font-extrabold drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]">
              WhatsApp
            </span>
            .
          </h1>

          {/* CTA Button with generous spacing */}
          <div className="pt-8">
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-12 py-8 text-xl font-semibold rounded-xl shadow-lg shadow-green-500/25 border-0 transition-all duration-300 hover:scale-105">
              Start Free Trial – Book 10 Appointments
            </Button>
          </div>

          {/* Simple rating indicator */}
          <div className="flex items-center justify-center gap-4 pt-6">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400 text-xl">★</span>
              ))}
            </div>
            <span className="text-slate-400">
              <span className="text-white font-semibold">4.9/5</span> from 200+ clients
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
