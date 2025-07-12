import React from 'react';
import { CheckCircle, Calendar, Settings, Clock, Sparkles } from 'lucide-react';

const StepOneDetails = () => {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center shadow-lg rounded-xl p-6 border border-slate-700/50" style={{
      backgroundColor: 'hsl(217, 35%, 12%)'
    }}>
      {/* Step badge and content */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">1</span>
          </div>
          <span className="text-emerald-400 font-medium text-sm uppercase tracking-wide">Step One</span>
        </div>
        
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
          Create account & get your professional calendar
        </h3>
        
        <p className="text-slate-300 text-base mb-6 leading-relaxed">
          Simply create your account and get instant access to your professional calendar system. 
          You can also connect your existing calendar if you prefer.
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-200">Instant professional calendar setup</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-200">Option to connect existing calendar</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-200">Immediate setup - no waiting</span>
          </div>
        </div>
      </div>
      
      {/* Visual representation */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="text-center">
          <div className="relative mb-4">
            <Calendar className="w-12 h-12 text-emerald-400 mx-auto" />
            <div className="absolute -inset-1 bg-emerald-400/20 rounded-full opacity-50"></div>
          </div>
          <h4 className="text-lg font-semibold text-white mb-4">Calendar Ready</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
              <span className="text-slate-200 text-sm">Professional Calendar</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-300 text-sm font-medium">Instantly active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepOneDetails;