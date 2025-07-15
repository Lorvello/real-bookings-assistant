import React from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Zap, Scissors, Stethoscope, Dumbbell, Smartphone, Calendar, Clock } from "lucide-react";

const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.05)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-30"
      ></div>
      
      {/* Radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-radial from-emerald-500/10 via-transparent to-transparent"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 text-center z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-6 lg:text-left">
            {/* Floating badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 backdrop-blur-sm animate-appear opacity-0">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 text-xs font-medium">AI-Powered Booking Revolution</span>
            </div>

            {/* Main headline - Step 1: Large, bold, prominent */}
            <h1 className="text-4xl md:text-6xl xl:text-7xl font-black text-white leading-[0.9] tracking-tight animate-appear opacity-100">
              <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent relative">
                Bookings
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 blur-xl -z-10"></div>
              </span>
              {" "}on Auto Pilot
              <br />
              via WhatsApp
            </h1>

            {/* Subline - Step 2: Smaller, compact, elegant */}
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed animate-appear opacity-100 delay-300">
              AI books appointments 24/7 through WhatsApp. 
              <span className="text-emerald-400 font-semibold"> Zero missed opportunities.</span>
            </p>

            {/* CTA Section - Step 4: Improved contrast and prominence */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 pt-4 animate-appear opacity-100 delay-500">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white px-8 py-4 text-lg font-bold rounded-xl shadow-2xl shadow-emerald-500/30 border-0 transition-all duration-300 hover:scale-105 hover:shadow-emerald-500/50 group min-h-[56px]">
                <MessageCircle className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                Start Free 7-Day Trial
              </Button>
              
              <button className="w-full sm:w-auto text-slate-300 hover:text-white text-lg font-medium flex items-center justify-center gap-2 group transition-colors min-h-[56px] px-6 border border-slate-600 rounded-xl hover:border-slate-500 backdrop-blur-sm">
                <Zap className="w-5 h-5 group-hover:text-emerald-400 transition-colors" />
                See how it works
              </button>
            </div>

            {/* Social proof - Refined */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-6 pt-4 animate-appear opacity-100 delay-700">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1">
                  <div className="w-8 h-8 bg-white rounded-full border-2 border-slate-700 flex items-center justify-center">
                    <Scissors className="w-4 h-4 text-slate-700" />
                  </div>
                  <div className="w-8 h-8 bg-white rounded-full border-2 border-slate-700 flex items-center justify-center">
                    <div className="w-4 h-4 bg-slate-700 rounded-t-full" style={{
                      clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)"
                    }}></div>
                  </div>
                  <div className="w-8 h-8 bg-white rounded-full border-2 border-slate-700 flex items-center justify-center">
                    <Dumbbell className="w-4 h-4 text-slate-700" />
                  </div>
                  <div className="w-8 h-8 bg-white rounded-full border-2 border-slate-700 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4 text-slate-700" />
                  </div>
                </div>
                <span className="text-slate-400 text-sm font-medium">1000+ businesses automated</span>
              </div>
              
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-lg">★</span>
                ))}
                <span className="text-slate-400 text-sm font-medium ml-2">4.9/5 rating</span>
              </div>
            </div>
          </div>

          {/* Right Column - Step 6: Visual element showing WhatsApp booking automation */}
          <div className="relative lg:block hidden">
            <div className="relative max-w-sm mx-auto">
              {/* Phone mockup */}
              <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-2 shadow-2xl border border-slate-700">
                <div className="bg-black rounded-2xl p-6 min-h-[500px] relative overflow-hidden">
                  {/* WhatsApp-style interface */}
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Smartphone className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">Spa Booking Assistant</div>
                        <div className="text-emerald-400 text-xs">Online</div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="space-y-3">
                      <div className="bg-slate-700 rounded-2xl p-3 max-w-[70%]">
                        <div className="text-white text-sm">Hi! I'd like to book a massage appointment.</div>
                      </div>
                      
                      <div className="bg-emerald-600 rounded-2xl p-3 max-w-[70%] ml-auto">
                        <div className="text-white text-sm">Perfect! I can help you book that. What day works best for you?</div>
                      </div>
                      
                      <div className="bg-slate-700 rounded-2xl p-3 max-w-[70%]">
                        <div className="text-white text-sm">Tomorrow around 3pm?</div>
                      </div>
                      
                      <div className="bg-emerald-600 rounded-2xl p-3 max-w-[70%] ml-auto">
                        <div className="text-white text-sm">Great! I have a 60-min Swedish massage available at 3:00 PM. Shall I book it?</div>
                      </div>
                      
                      <div className="bg-slate-700 rounded-2xl p-3 max-w-[70%]">
                        <div className="text-white text-sm">Yes, please!</div>
                      </div>
                      
                      <div className="bg-emerald-600 rounded-2xl p-3 max-w-[70%] ml-auto">
                        <div className="text-white text-sm">✅ Booked! Your appointment is confirmed for tomorrow at 3:00 PM.</div>
                      </div>
                    </div>

                    {/* Floating elements */}
                    <div className="absolute top-20 -right-4 bg-emerald-500/20 backdrop-blur-sm rounded-full p-2 animate-pulse">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="absolute bottom-20 -left-4 bg-emerald-500/20 backdrop-blur-sm rounded-full p-2 animate-pulse delay-1000">
                      <Clock className="w-4 h-4 text-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating stats */}
              <div className="absolute -top-6 -left-6 bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-xl p-3">
                <div className="text-emerald-400 text-xs font-medium">24/7 Active</div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-xl p-3">
                <div className="text-emerald-400 text-xs font-medium">Instant Response</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;