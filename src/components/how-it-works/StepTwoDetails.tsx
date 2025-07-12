
import React from 'react';
import { CheckCircle, Shield, Star, MessageSquare, MessageCircle, Users } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="relative group">
      {/* Premium card with multiple shadow layers */}
      <div className="grid md:grid-cols-2 gap-8 items-center relative overflow-hidden
                    bg-gradient-to-br from-[hsl(217,35%,12%)] via-[hsl(217,35%,10%)] to-[hsl(217,35%,14%)]
                    rounded-2xl p-8
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
                          rounded-xl flex items-center justify-center
                          shadow-lg shadow-emerald-500/30
                          before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:rounded-xl
                          after:absolute after:-inset-1 after:bg-gradient-to-br after:from-emerald-400/50 after:to-transparent after:rounded-xl after:blur-sm after:-z-10">
              <span className="text-white text-lg font-bold relative z-10">2</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-emerald-300 font-semibold text-sm uppercase tracking-wider">Step Two</span>
            <div className="w-12 h-0.5 bg-gradient-to-r from-emerald-400 to-transparent mt-1"></div>
          </div>
        </div>
        
        {/* Premium Typography */}
        <h3 className="text-3xl md:text-4xl font-bold mb-6 leading-tight tracking-tight
                     bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
          Get your WhatsApp number instantly
        </h3>
        
        <p className="text-slate-300 text-lg mb-8 leading-relaxed font-light">
          Your account comes with an instant WhatsApp number assignment. You can also choose to 
          connect your existing business number if you prefer.
        </p>
        
        {/* Enhanced Options */}
        <div className="space-y-4 mb-8">
          <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-emerald-600/5 
                        border border-emerald-400/30 p-6 rounded-xl backdrop-blur-sm
                        shadow-lg shadow-emerald-500/10 relative overflow-hidden
                        transition-all duration-300 hover:shadow-emerald-500/20 hover:border-emerald-400/50">
            <div className="absolute top-4 right-4">
              <Star className="w-5 h-5 text-emerald-400 fill-current drop-shadow-sm" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6 text-emerald-400" />
                <h4 className="text-lg font-bold text-white">Instant number assignment</h4>
                <span className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-lg">
                  Automatic
                </span>
              </div>
              <p className="text-emerald-100 text-sm mb-3 leading-relaxed">
                Your unique WhatsApp number is assigned immediately upon account creation.
              </p>
              <div className="text-emerald-200 text-xs">
                <strong>Perfect for:</strong> Immediate start, zero configuration
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/5 to-transparent"></div>
          </div>
          
          <div className="bg-gradient-to-r from-slate-700/60 via-slate-700/40 to-slate-800/60 
                        border border-slate-500/30 p-6 rounded-xl backdrop-blur-sm
                        shadow-lg shadow-black/20 relative overflow-hidden
                        transition-all duration-300 hover:shadow-emerald-500/10 hover:border-emerald-500/30">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="w-6 h-6 text-emerald-400" />
                <h4 className="text-lg font-bold text-white">Connect existing number</h4>
              </div>
              <p className="text-slate-200 text-sm mb-3 leading-relaxed">
                You can also connect your existing business WhatsApp number to our system.
              </p>
              <div className="text-slate-300 text-xs">
                <strong>Perfect for:</strong> Existing business number, brand consistency
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
          </div>
        </div>
      </div>
      
      {/* Premium Visual Section */}
      <div className="relative z-10">
        <div className="bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-900/60 
                      border border-slate-600/50 rounded-2xl p-8 backdrop-blur-sm
                      shadow-inner shadow-black/20
                      before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:rounded-2xl">
          <div className="text-center relative z-10">
            {/* Enhanced Icon */}
            <div className="relative mb-6 inline-block">
              <div className="relative">
                <MessageCircle className="w-16 h-16 text-emerald-400 mx-auto drop-shadow-lg" />
                <div className="absolute -inset-2 bg-emerald-400/30 rounded-full opacity-60 blur-md animate-pulse"></div>
                <div className="absolute -inset-4 bg-emerald-400/10 rounded-full opacity-40 blur-lg"></div>
              </div>
            </div>
            
            <h4 className="text-xl font-bold text-white mb-6 tracking-wide">WhatsApp Ready</h4>
            
            {/* Enhanced Status Cards */}
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/15 to-emerald-600/10 
                            border border-emerald-400/40 p-4 rounded-xl
                            shadow-lg shadow-emerald-500/10
                            relative overflow-hidden">
                <div className="flex items-center justify-center gap-3 mb-2 relative z-10">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
                  <span className="text-emerald-200 text-sm font-semibold tracking-wide">Number Assigned</span>
                </div>
                <p className="text-emerald-100 text-xs font-mono bg-emerald-500/10 px-3 py-1 rounded-lg inline-block">
                  +31 6 12345678
                </p>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/5 to-transparent"></div>
              </div>
              
              <div className="bg-gradient-to-r from-slate-700/60 to-slate-600/40 
                            border border-slate-500/30 p-4 rounded-xl
                            shadow-lg shadow-black/20
                            transition-all duration-300 hover:shadow-emerald-500/10">
                <div className="flex items-center justify-center gap-3">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span className="text-slate-100 text-sm font-medium">Ready for Customers</span>
                </div>
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

export default StepTwoDetails;
