
import React from 'react';
import { MessageCircle, Calendar, Users, CheckCircle, Bot, Sparkles } from 'lucide-react';

const StepThreeDetails = () => {
  return (
    <div className="relative group">
      {/* Premium card with multiple shadow layers - Mobile: much smaller, Desktop: unchanged */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-8 items-center relative overflow-hidden
                    bg-gradient-to-br from-[hsl(217,35%,12%)] via-[hsl(217,35%,10%)] to-[hsl(217,35%,14%)]
                    rounded-xl md:rounded-2xl p-2 md:p-3
                    shadow-lg md:shadow-2xl shadow-black/30 md:shadow-black/50
                    before:absolute before:inset-0 before:bg-gradient-to-r before:from-emerald-500/5 before:to-transparent before:rounded-xl md:before:rounded-2xl
                    after:absolute after:inset-px after:bg-gradient-to-br after:from-white/5 after:to-transparent after:rounded-xl md:after:rounded-2xl after:pointer-events-none
                    backdrop-blur-xl
                    transition-all duration-500 ease-out
                    hover:shadow-emerald-500/20 hover:shadow-xl md:hover:shadow-3xl hover:scale-[1.01] md:hover:scale-[1.02]
                    transform-gpu">
      
      {/* Content Section */}
      <div className="relative z-10">
        {/* Premium Step Badge - Mobile: smaller */}
        <div className="flex items-center gap-1 md:gap-4 mb-2 md:mb-6">
          <div className="relative">
            <div className="w-4 h-4 md:w-10 md:h-10 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 
                          rounded-xl flex items-center justify-center
                          shadow-sm md:shadow-lg shadow-emerald-500/30
                          before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:rounded-xl
                          after:absolute after:-inset-1 after:bg-gradient-to-br after:from-emerald-400/50 after:to-transparent after:rounded-xl after:blur-sm after:-z-10">
              <span className="text-white text-xs md:text-lg font-bold relative z-10">3</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-emerald-300 font-semibold text-xs md:text-sm uppercase tracking-wider">Step Three</span>
            <div className="w-6 md:w-12 h-0.5 bg-gradient-to-r from-emerald-400 to-transparent mt-0.5"></div>
          </div>
        </div>
        
        {/* Premium Typography - Mobile: much smaller */}
        <h3 className="text-base md:text-2xl xl:text-3xl font-bold mb-1 md:mb-4 leading-tight tracking-tight
                     bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
          Your system goes live immediately
        </h3>
        
        <p className="text-slate-300 text-xs md:text-base mb-2 md:mb-4 leading-relaxed font-light">
          That's it! Your entire booking system is instantly active and ready to serve customers 24/7. 
          You can adjust settings anytime, but everything works perfectly from day one.
        </p>
        
        {/* Enhanced Feature List - Mobile: smaller */}
        <div className="space-y-1 md:space-y-2 mb-2 md:mb-4">
           <div className="flex items-start gap-1 md:gap-4 p-1 md:p-3 rounded-lg md:rounded-xl bg-white/5 backdrop-blur-sm border border-white/10
                        transition-all duration-300 hover:bg-white/10 hover:border-emerald-400/30">
            <div className="relative mt-1">
              <Bot className="w-3 h-3 md:w-6 md:h-6 text-emerald-400 drop-shadow-sm" />
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-sm -z-10"></div>
            </div>
            <div>
              <h4 className="font-bold text-white text-xs md:text-base mb-0.5">Instant activation</h4>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed">Everything works immediately after account creation</p>
            </div>
          </div>
          
           <div className="flex items-start gap-1 md:gap-4 p-1 md:p-3 rounded-lg md:rounded-xl bg-white/5 backdrop-blur-sm border border-white/10
                        transition-all duration-300 hover:bg-white/10 hover:border-emerald-400/30">
            <div className="relative mt-1">
              <Sparkles className="w-3 h-3 md:w-6 md:h-6 text-emerald-400 drop-shadow-sm" />
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-sm -z-10"></div>
            </div>
            <div>
              <h4 className="font-bold text-white text-xs md:text-base mb-0.5">Optional customization</h4>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed">Adjust settings anytime to match your preferences</p>
            </div>
          </div>
          
           <div className="flex items-start gap-1 md:gap-4 p-1 md:p-3 rounded-lg md:rounded-xl bg-white/5 backdrop-blur-sm border border-white/10
                        transition-all duration-300 hover:bg-white/10 hover:border-emerald-400/30">
            <div className="relative mt-1">
              <CheckCircle className="w-3 h-3 md:w-6 md:h-6 text-emerald-400 drop-shadow-sm" />
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-sm -z-10"></div>
            </div>
            <div>
              <h4 className="font-bold text-white text-xs md:text-base mb-0.5">24/7 ready to serve</h4>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed">Your customers can book immediately via WhatsApp</p>
            </div>
          </div>
        </div>
        
        {/* Live Status Banner - Mobile: smaller */}
        <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/15 to-emerald-600/10 
                      border border-emerald-400/40 p-1 md:p-4 rounded-lg md:rounded-xl
                      shadow-sm md:shadow-lg shadow-emerald-500/10
                      relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-1 md:gap-3 mb-0.5 md:mb-2">
              <div className="w-2 h-2 md:w-3 md:h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
              <span className="text-emerald-200 font-bold text-sm md:text-lg tracking-wide">Live Status</span>
            </div>
            <p className="text-emerald-100 text-xs md:text-sm leading-relaxed">
              Your complete booking system is active and serving customers
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/5 to-transparent"></div>
        </div>
      </div>
      
      {/* Premium Visual Section - Mobile: smaller */}
      <div className="relative z-10">
        <div className="bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-900/60 
                      border border-slate-600/50 rounded-xl md:rounded-2xl p-2 md:p-6 backdrop-blur-sm
                      shadow-inner shadow-black/20
                      before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:rounded-xl md:before:rounded-2xl">
          <div className="space-y-2 md:space-y-6 relative z-10">
            <div className="text-center">
              <div className="relative mb-1 md:mb-4 inline-block">
                <div className="relative">
                  <MessageCircle className="w-8 h-8 md:w-16 md:h-16 text-emerald-400 mx-auto drop-shadow-lg" />
                  <div className="absolute -inset-2 bg-emerald-400/30 rounded-full opacity-60 blur-md animate-pulse"></div>
                  <div className="absolute -inset-4 bg-emerald-400/10 rounded-full opacity-40 blur-lg"></div>
                </div>
              </div>
              <h4 className="text-sm md:text-xl font-bold text-white tracking-wide">System Active</h4>
            </div>
            
            {/* Enhanced Status Cards - Mobile: smaller */}
            <div className="space-y-1 md:space-y-3">
              <div className="bg-gradient-to-r from-slate-700/60 to-slate-600/40 
                            border border-slate-500/30 p-1 md:p-4 rounded-lg md:rounded-xl
                            shadow-sm md:shadow-lg shadow-black/20
                            transition-all duration-300 hover:shadow-emerald-500/10">
                <div className="flex items-center gap-1 md:gap-3 mb-0.5 md:mb-2">
                  <Calendar className="w-3 h-3 md:w-5 md:h-5 text-emerald-400" />
                  <span className="text-white font-bold text-xs md:text-sm">Calendar Live</span>
                </div>
                <p className="text-slate-300 text-xs">Accepting bookings instantly</p>
              </div>
              
              <div className="bg-gradient-to-r from-slate-700/60 to-slate-600/40 
                            border border-slate-500/30 p-1 md:p-4 rounded-lg md:rounded-xl
                            shadow-sm md:shadow-lg shadow-black/20
                            transition-all duration-300 hover:shadow-emerald-500/10">
                <div className="flex items-center gap-1 md:gap-3 mb-0.5 md:mb-2">
                  <Users className="w-3 h-3 md:w-5 md:h-5 text-emerald-400" />
                  <span className="text-white font-bold text-xs md:text-sm">AI Assistant</span>
                </div>
                <p className="text-slate-300 text-xs">Ready to help customers</p>
              </div>
              
              <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/15 to-emerald-600/10 
                            border border-emerald-400/40 p-1 md:p-4 rounded-lg md:rounded-xl
                            shadow-sm md:shadow-lg shadow-emerald-500/10
                            relative overflow-hidden">
                <div className="flex items-center justify-center gap-1 md:gap-3 relative z-10">
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
                  <span className="text-emerald-200 text-xs md:text-sm font-bold tracking-wide">Live and Serving</span>
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

export default StepThreeDetails;
