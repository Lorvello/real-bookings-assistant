
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative min-h-screen bg-slate-900 overflow-hidden">
      {/* Dark grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.8)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Your AI Appointment Agent –<br />
                Bookings on{" "}
                <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                  Auto-Pilot
                </span>
              </h1>
              
              <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">
                No phone calls, no missed leads, no double bookings. Fully automated, 
                fully personal — all via WhatsApp.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-green-500/25 border-0">
                Start Free Trial – Book 10 Appointments
              </Button>
              
              <Button 
                variant="outline" 
                className="border-2 border-green-500/50 text-green-400 hover:bg-green-500/10 px-8 py-6 text-lg font-semibold rounded-xl bg-transparent"
              >
                See Demo
              </Button>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-4 pt-4">
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

          {/* Right Side - Glowing UI Element */}
          <div className="lg:ml-8">
            <div className="relative">
              {/* Glowing card container */}
              <div className="relative bg-slate-800/50 backdrop-blur-sm border border-green-500/30 rounded-2xl p-8 shadow-2xl">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur opacity-75"></div>
                
                {/* AI-Powered badge */}
                <div className="relative mb-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                    🤖 AI-Powered
                  </span>
                </div>

                {/* Conversation simulation */}
                <div className="relative space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2 animate-pulse"></div>
                    <div className="text-slate-300">
                      Hi! I'd like to book an appointment for next week.
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2 animate-pulse"></div>
                    <div className="text-slate-300">
                      Perfect! What service are you interested in?
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2 animate-pulse"></div>
                    <div className="text-slate-300">
                      Great choice! I have Tuesday 2PM or Friday 10AM available. Which works better?
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="text-green-400 font-medium">✓ Appointment Confirmed</div>
                    <div className="text-slate-400 text-sm mt-1">Calendar updated • Reminder set • Client notified</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
