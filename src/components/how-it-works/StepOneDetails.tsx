
import React from 'react';
import { CheckCircle, Calendar, Settings, Clock, Sparkles, ArrowDown } from 'lucide-react';

const StepOneDetails = () => {
  return (
    <div className="relative">
      {/* Step Header */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/25">
            <span className="text-white text-2xl font-bold">1</span>
          </div>
          <div className="text-left">
            <h3 className="text-4xl lg:text-5xl font-bold text-white mb-2">
              Fill in your <span className="text-emerald-400">basic information</span>
            </h3>
            <div className="flex items-center gap-3 text-emerald-300">
              <Sparkles className="w-5 h-5" />
              <span className="text-lg font-medium">Super simple - 2 minutes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-16 items-start">
        
        {/* Left Content */}
        <div className="space-y-8">
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
            <h4 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
              What we need from you
            </h4>
            
            <div className="space-y-4">
              {[
                'Your business name',
                'Website URL (optional)', 
                'Email address',
                'Type of services you offer'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-slate-200 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Time Indicator */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-3">
              <Clock className="w-6 h-6 text-emerald-400" />
              <span className="text-emerald-400 font-bold text-xl">Time needed: 2 minutes</span>
            </div>
            <p className="text-slate-300">
              No technical knowledge required. Our setup wizard guides you through every step.
            </p>
          </div>
        </div>
        
        {/* Right Content - Calendar Options */}
        <div className="space-y-6">
          <h4 className="text-3xl font-bold text-white flex items-center gap-4 mb-8">
            <Calendar className="w-8 h-8 text-emerald-400" />
            Choose your calendar
          </h4>
          
          {/* Option 1 - Recommended */}
          <div className="relative">
            <div className="absolute -top-4 -right-4 z-10">
              <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                ⭐ RECOMMENDED
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-2 border-emerald-500/30 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <Calendar className="w-6 h-6 text-emerald-400" />
                <span className="font-bold text-white text-xl">Use our calendar system</span>
              </div>
              
              <div className="space-y-3 mb-6">
                {[
                  'Ready to use immediately',
                  'Local phone number included', 
                  'Fully managed by our team'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-emerald-400/20 border border-emerald-400/30 rounded-xl p-4">
                <p className="text-emerald-200 text-sm font-medium">
                  Perfect for businesses that want to start immediately without any setup hassle.
                </p>
              </div>
            </div>
          </div>
          
          {/* Option 2 */}
          <div className="bg-slate-800/50 border border-slate-600/50 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-4">
              <Settings className="w-6 h-6 text-slate-400" />
              <span className="font-bold text-white text-xl">Connect your existing calendar</span>
            </div>
            
            <div className="space-y-3 mb-6">
              {[
                'Google Calendar, Outlook, Apple Calendar',
                'Keep your current workflow',
                'Automatic synchronization'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-4">
              <p className="text-slate-400 text-sm">
                Perfect for established businesses with existing calendar systems.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Arrow */}
      <div className="flex justify-center mt-16">
        <div className="flex flex-col items-center">
          <ArrowDown className="w-8 h-8 text-emerald-400 animate-bounce" />
          <span className="text-emerald-400 text-sm font-medium mt-2">Next step</span>
        </div>
      </div>
    </div>
  );
};

export default StepOneDetails;
