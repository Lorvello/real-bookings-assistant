import React from 'react';
import { CheckCircle, Calendar, Settings, Clock, Sparkles } from 'lucide-react';

const StepOneDetails = () => {
  return (
    <div className="relative group">
      {/* Premium card with multiple shadow layers */}
      <div className="grid md:grid-cols-2 gap-8 items-center relative overflow-hidden
                    bg-gradient-to-br from-[hsl(217,35%,12%)] via-[hsl(217,35%,10%)] to-[hsl(217,35%,14%)]
                    rounded-2xl p-3
                    shadow-2xl shadow-black/50
                    before:absolute before:inset-0 before:bg-gradient-to-r before:from-emerald-500/5 before:to-transparent before:rounded-2xl
                    after:absolute after:inset-px after:bg-gradient-to-br after:from-white/5 after:to-transparent after:rounded-2xl after:pointer-events-none
                    backdrop-blur-xl
                    transition-all duration-500 ease-out
                    hover:shadow-emerald-500/20 hover:shadow-3xl hover:scale-[1.02]
                    transform-gpu">
      
      {/* Content Section */}
      <div className="relative z-10">
        {/* Premium Step Badge */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 
                          rounded-full flex items-center justify-center
                          shadow-lg shadow-emerald-500/30
                          before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:rounded-full
                          after:absolute after:-inset-1 after:bg-gradient-to-br after:from-emerald-400/50 after:to-transparent after:rounded-full after:blur-sm after:-z-10">
              <span className="text-white text-lg font-bold relative z-10">1</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-emerald-300 font-semibold text-sm uppercase tracking-wider">Step One</span>
            <div className="w-12 h-0.5 bg-gradient-to-r from-emerald-400 to-transparent mt-1"></div>
          </div>
        </div>
        
        {/* Premium Typography */}
        <h3 className="text-2xl md:text-3xl font-bold mb-4 leading-tight tracking-tight
                     bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
          Create account & get your professional calendar
        </h3>
        
        <p className="text-slate-300 text-base mb-4 leading-relaxed font-light">
          Simply create your account and get instant access to your professional calendar system. 
          You can also connect your existing calendar if you prefer.
        </p>
        
        {/* Enhanced Feature List */}
        <div className="space-y-2">
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10
                        transition-all duration-300 hover:bg-white/10 hover:border-emerald-400/30">
            <div className="relative">
              <CheckCircle className="w-5 h-5 text-emerald-400 drop-shadow-sm" />
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-sm -z-10"></div>
            </div>
            <span className="text-slate-100 font-medium">Instant professional calendar setup</span>
          </div>
           <div className="flex items-center gap-4 p-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10
                        transition-all duration-300 hover:bg-white/10 hover:border-emerald-400/30">
            <div className="relative">
              <CheckCircle className="w-5 h-5 text-emerald-400 drop-shadow-sm" />
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-sm -z-10"></div>
            </div>
            <span className="text-slate-100 font-medium">Option to connect existing calendar</span>
          </div>
           <div className="flex items-center gap-4 p-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10
                        transition-all duration-300 hover:bg-white/10 hover:border-emerald-400/30">
            <div className="relative">
              <CheckCircle className="w-5 h-5 text-emerald-400 drop-shadow-sm" />
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-sm -z-10"></div>
            </div>
            <span className="text-slate-100 font-medium">Immediate setup - no waiting</span>
          </div>
        </div>
      </div>
      
      {/* Premium Visual Section */}
      <div className="relative z-10">
        <div className="bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-900/60 
                      border border-slate-600/50 rounded-2xl p-6 backdrop-blur-sm
                      shadow-inner shadow-black/20
                      before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:rounded-2xl">
          <div className="text-center relative z-10">
            {/* Enhanced Icon */}
            <div className="relative mb-6 inline-block">
              <div className="relative">
                <Calendar className="w-16 h-16 text-emerald-400 mx-auto drop-shadow-lg" />
                <div className="absolute -inset-2 bg-emerald-400/30 rounded-full opacity-60 blur-md animate-pulse"></div>
                <div className="absolute -inset-4 bg-emerald-400/10 rounded-full opacity-40 blur-lg"></div>
              </div>
            </div>
            
            <h4 className="text-xl font-bold text-white mb-6 tracking-wide">Calendar Ready</h4>
            
            {/* Enhanced Status Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 
                            bg-gradient-to-r from-slate-700/60 to-slate-600/40 
                            border border-slate-500/30 rounded-xl
                            shadow-lg shadow-black/20
                            transition-all duration-300 hover:shadow-emerald-500/10">
                <span className="text-slate-100 text-sm font-medium">Professional Calendar</span>
                <div className="relative">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-sm -z-10"></div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/15 to-emerald-600/10 
                            border border-emerald-400/40 p-4 rounded-xl
                            shadow-lg shadow-emerald-500/10
                            relative overflow-hidden">
                <div className="flex items-center justify-center gap-3 relative z-10">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
                  <span className="text-emerald-200 text-sm font-semibold tracking-wide">Instantly Active</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/5 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Ambient Glow Effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10"></div>
    </div>
    </div>
  );
};

export default StepOneDetails;
