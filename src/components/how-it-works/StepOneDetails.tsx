
import React from 'react';
import { CheckCircle, Calendar, Settings, Clock, Sparkles } from 'lucide-react';

const StepOneDetails = () => {
  return (
    <div className="relative">
      <div className="grid lg:grid-cols-2 gap-6 md:gap-12 items-center">
        {/* Left side - Content */}
          <div className="space-y-8 md:space-y-6">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="w-6 h-6 md:w-10 md:h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xs md:text-lg font-bold">1</span>
              </div>
              <div>
                <h3 className="text-base md:text-2xl lg:text-3xl font-bold text-white mb-1">Quick Setup</h3>
                <div className="flex items-center gap-1 text-emerald-400">
                  <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm font-medium">Live in 2 minutes</span>
                </div>
              </div>
            </div>
          
          <div className="space-y-4 md:space-y-4">
            <p className="text-xs md:text-sm text-slate-300 md:hidden">
              Quick setup: Business info + WhatsApp
            </p>
            
            <div className="hidden md:grid gap-2">
              {[
                'Business name & email',
                'Service types'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 text-xs md:text-sm">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="border-l-4 border-emerald-400 pl-3 bg-emerald-500/5 py-2 rounded-r-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold text-xs md:text-sm">2 minutes setup</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="relative">
          <div className="space-y-3 md:space-y-4">
            <h4 className="text-sm md:text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
              <span className="md:hidden">Calendar options</span>
              <span className="hidden md:inline">Calendar options</span>
            </h4>
            
            <div className="space-y-2 md:space-y-3">
              <div className="border border-emerald-500/30 rounded-lg p-3 bg-emerald-500/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-xs">Use our calendar</span>
                  <div className="px-2 py-0.5 bg-emerald-500 text-white rounded-full">
                    <span className="text-xs font-bold">FAST</span>
                  </div>
                </div>
                <p className="text-slate-300 text-xs">Live in 30 seconds</p>
              </div>
              
              <div className="border border-slate-600 rounded-lg p-3">
                <span className="font-bold text-white text-xs">Connect existing</span>
                <p className="text-slate-300 text-xs md:hidden">Google, Outlook, Apple</p>
                <p className="text-slate-300 text-xs hidden md:block">Google, Outlook, Apple</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepOneDetails;
