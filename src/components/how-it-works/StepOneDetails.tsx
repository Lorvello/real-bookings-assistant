
import React from 'react';
import { CheckCircle, Calendar, Settings, Clock, Sparkles } from 'lucide-react';

const StepOneDetails = () => {
  return (
    <div className="relative">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left side - Content */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-bold">1</span>
            </div>
            <div>
              <h3 className="text-2xl lg:text-3xl font-bold text-white mb-1">Fill in your basic information</h3>
              <div className="flex items-center gap-2 text-emerald-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Super simple</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                What do you need?
              </h4>
              <div className="grid gap-3">
                {[
                  'Your business name',
                  'Website URL (optional)', 
                  'Email address',
                  'Type of services you offer'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-l-4 border-emerald-400 pl-4 bg-emerald-500/5 py-3 rounded-r-lg">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Time needed: 2 minutes</span>
              </div>
              <p className="text-slate-300 text-sm">
                No technical knowledge required. Our wizard guides you through every step.
              </p>
            </div>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="relative">
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-white flex items-center gap-3">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Connect calendar
            </h4>
            
            <div className="space-y-4">
              {/* Recommended option */}
              <div className="relative">
                <div className="border border-emerald-500/30 rounded-xl p-5 bg-emerald-500/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white text-sm">Option 1: Use our calendar</span>
                    </div>
                    <div className="px-2 py-1 bg-emerald-500 text-white rounded-full">
                      <span className="text-xs font-bold">RECOMMENDED</span>
                    </div>
                  </div>
                  <p className="text-slate-300 text-xs mb-2">Ready to use immediately. No setup needed.</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-emerald-400 text-xs font-medium">Live in 30 seconds</span>
                  </div>
                </div>
              </div>
              
              {/* Second option */}
              <div className="border border-slate-600 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-white text-sm">Option 2: Connect your own calendar</span>
                </div>
                <p className="text-slate-300 text-xs mb-2">Google Calendar, Outlook, Apple Calendar - everything syncs automatically.</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                  <span className="text-slate-400 text-xs font-medium">Setup in 2 minutes</span>
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
