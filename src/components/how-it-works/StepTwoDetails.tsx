
import React from 'react';
import { CheckCircle, Shield, Star, MessageSquare } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="relative">
      <div className="grid lg:grid-cols-2 gap-6 md:gap-8 items-center">
        {/* Left side - Content */}
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-sm md:text-lg font-bold">2</span>
            </div>
            <div>
              <h3 className="text-lg md:text-2xl lg:text-3xl font-bold text-white mb-1">Choose WhatsApp Option</h3>
              <div className="flex items-center gap-2 text-emerald-400">
                <MessageSquare className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium">Two simple options</span>
              </div>
            </div>
          </div>
          
          <p className="text-sm md:text-lg text-slate-300 leading-relaxed">
            We can arrange a new WhatsApp number for you, or help you connect your existing one.
          </p>
          
          <div className="border-l-4 border-emerald-400 pl-3 md:pl-4 bg-emerald-500/5 py-2 md:py-3 rounded-r-lg">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
              <span className="text-emerald-400 font-bold text-sm md:text-base">100% secure</span>
            </div>
            <p className="text-slate-300 text-xs md:text-sm">
              Your WhatsApp data remains completely private and GDPR compliant.
            </p>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="text-center">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 md:p-8">
            <div className="relative mb-6">
              <MessageSquare className="w-12 h-12 md:w-14 md:h-14 text-emerald-400 mx-auto" />
              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full blur opacity-75"></div>
            </div>
            <h4 className="text-base md:text-lg font-bold text-white mb-2">Your Choice</h4>
            <p className="text-slate-300 text-sm">
              New number (fastest) or use your existing WhatsApp
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepTwoDetails;
