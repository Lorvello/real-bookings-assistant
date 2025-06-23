
import React from 'react';
import { CheckCircle, Calendar, Settings, Clock, Sparkles } from 'lucide-react';

const StepOneDetails = () => {
  return (
    <div className="relative bg-gradient-to-r from-emerald-500/5 to-emerald-600/10 rounded-3xl p-8 border border-emerald-500/20">
      {/* Background accent */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-t-3xl"></div>
      
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left side - Content */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-xl border-2 border-emerald-400">
              <span className="text-white text-xl font-bold">1</span>
            </div>
            <div>
              <h3 className="text-3xl lg:text-4xl font-bold text-white mb-2">Fill in your basic information</h3>
              <div className="flex items-center gap-2 text-emerald-300">
                <Sparkles className="w-5 h-5" />
                <span className="text-base font-semibold">Super simple</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-xl font-bold text-emerald-300 mb-4 flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-300 rounded-full"></div>
                What do you need?
              </h4>
              <div className="grid gap-4">
                {[
                  'Your business name',
                  'Website URL (optional)', 
                  'Email address',
                  'Type of services you offer'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-emerald-500/30">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-slate-200 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-l-4 border-emerald-400 pl-6 bg-emerald-500/10 py-4 rounded-r-xl border border-emerald-500/20">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6 text-emerald-400" />
                <span className="text-emerald-300 font-bold text-lg">Time needed: 2 minutes</span>
              </div>
              <p className="text-slate-300">
                No technical knowledge required. Our wizard guides you through every step.
              </p>
            </div>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="relative">
          <div className="space-y-6">
            <h4 className="text-2xl font-bold text-white flex items-center gap-3">
              <Calendar className="w-6 h-6 text-emerald-400" />
              Connect calendar
            </h4>
            
            <div className="space-y-4">
              {/* Recommended option */}
              <div className="relative">
                <div className="border-2 border-emerald-400/50 rounded-2xl p-6 bg-emerald-500/10 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold text-white">Option 1: Use our calendar</span>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500 text-white rounded-full shadow-lg">
                      <span className="text-xs font-bold">RECOMMENDED</span>
                    </div>
                  </div>
                  <p className="text-slate-300 mb-3">Ready to use immediately. No setup needed.</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-emerald-300 text-sm font-semibold">Live in 30 seconds</span>
                  </div>
                </div>
              </div>
              
              {/* Second option */}
              <div className="border border-slate-500 rounded-2xl p-6 bg-slate-800/40 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="w-5 h-5 text-slate-400" />
                  <span className="font-bold text-white">Option 2: Connect your own calendar</span>
                </div>
                <p className="text-slate-300 mb-3">Google Calendar, Outlook, Apple Calendar - everything syncs automatically.</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                  <span className="text-slate-400 text-sm font-semibold">Setup in 2 minutes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepOneDetails;
