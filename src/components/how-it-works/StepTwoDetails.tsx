
import React from 'react';
import { CheckCircle, Shield, Star, MessageSquare } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="relative">
      <div className="grid lg:grid-cols-2 gap-6 md:gap-12 items-center">
        {/* Left side - Content */}
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-8 h-8 md:w-14 md:h-14 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-2xl border border-slate-500/20">
              <div className="absolute inset-1 bg-gradient-to-br from-slate-500/20 to-transparent rounded-xl"></div>
              <span className="relative text-white text-sm md:text-xl font-bold">2</span>
            </div>
            <div>
              <h3 className="text-xl md:text-4xl lg:text-5xl font-bold text-white mb-2 tracking-tight">Choose WhatsApp Option</h3>
              <div className="flex items-center gap-2 text-slate-300">
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-lg font-medium">Two simple options</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 md:space-y-6">
            <p className="text-xs md:text-lg text-slate-300 leading-relaxed">
              <span className="md:hidden">Choose: new number or use yours</span>
              <span className="hidden md:inline">You have two options to get started. We ensure everything works seamlessly, without you having to do anything technical.</span>
            </p>
            
            <div className="border-l-4 border-emerald-400 pl-3 md:pl-4 bg-emerald-500/5 py-2 md:py-3 rounded-r-lg">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                <span className="text-emerald-400 font-bold text-sm md:text-base">
                  <span className="md:hidden">100% secure</span>
                  <span className="hidden md:inline">100% secure and GDPR compliant</span>
                </span>
              </div>
              <p className="text-slate-300 text-xs md:text-sm">
                Your WhatsApp data remains completely private.
              </p>
            </div>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="space-y-3 md:space-y-4">
          {/* Recommended option */}
          <div className="relative">
            <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 z-10">
              <div className="bg-emerald-500 text-white px-2 py-1 md:px-3 md:py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                <Star className="w-2 h-2 md:w-3 md:h-3" />
                Recommended
              </div>
            </div>
            
            <div className="border border-emerald-500/30 rounded-xl p-4 md:p-6 bg-emerald-500/5">
              <h4 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4 flex items-center gap-3">
                <MessageSquare className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
                <span className="md:hidden">We arrange number</span>
                <span className="hidden md:inline">We arrange a number for you</span>
              </h4>
              
              <div className="space-y-2 md:space-y-3 mb-3 md:mb-4">
                {[
                  'Live within 5 minutes',
                  'Local number', 
                  'Fully managed by us'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-200 text-xs md:text-sm">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 md:p-3">
                <p className="text-xs text-slate-300">
                  <strong className="text-white">Perfect for:</strong> Businesses that want to start quickly without hassle.
                </p>
              </div>
            </div>
          </div>
          
          {/* Second option */}
          <div className="border border-slate-600 rounded-xl p-4 md:p-6">
            <h4 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4 flex items-center gap-3">
              <MessageSquare className="w-3 h-3 md:w-4 md:h-4 text-slate-400" />
              <span className="md:hidden">Use your number</span>
              <span className="hidden md:inline">Use your own number</span>
            </h4>
            
            <div className="space-y-2 md:space-y-3 mb-3 md:mb-4">
              {[
                'Keep your current number',
                'Customers already know it',
                'Step-by-step guidance'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-300 text-xs md:text-sm">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="bg-slate-700/20 border border-slate-600/30 rounded-lg p-2 md:p-3">
              <p className="text-xs text-slate-400">
                <strong className="text-slate-200">Perfect for:</strong> Established businesses with a known WhatsApp number.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepTwoDetails;
