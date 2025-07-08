
import React from 'react';
import { MessageCircle, Calendar, Users, CheckCircle, Bot, Sparkles } from 'lucide-react';

const StepThreeDetails = () => {
  return (
    <div className="relative">
      <div className="grid lg:grid-cols-2 gap-6 md:gap-8 items-center">
        {/* Left side - Content */}
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-sm md:text-lg font-bold">3</span>
            </div>
            <div>
              <h3 className="text-lg md:text-2xl lg:text-3xl font-bold text-white mb-1">AI Assistant Live</h3>
              <div className="flex items-center gap-2 text-emerald-400">
                <Bot className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium">24/7 automated</span>
              </div>
            </div>
          </div>
          
          <p className="text-sm md:text-lg text-slate-300 leading-relaxed">
            Your AI booking assistant is now live and ready to handle all customer conversations automatically.
          </p>
          
          <div className="border-l-4 border-emerald-400 pl-3 md:pl-4 bg-emerald-500/5 py-2 md:py-3 rounded-r-lg">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
              <span className="text-emerald-400 font-bold text-sm md:text-base">Fully automated</span>
            </div>
            <p className="text-slate-300 text-xs md:text-sm">
              Books, reschedules, and handles customer questions 24/7 in your style.
            </p>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="text-center">
          <div className="border border-emerald-500/30 rounded-xl p-6 md:p-8 bg-emerald-500/5">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <div className="w-3 h-3 md:w-4 md:h-4 bg-white rounded-full animate-pulse"></div>
            </div>
            
            <h4 className="font-bold text-white mb-2 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
              <span className="text-base md:text-lg">24/7 Active</span>
            </h4>
            <p className="text-slate-300 text-sm">Live and ready to book appointments</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepThreeDetails;
