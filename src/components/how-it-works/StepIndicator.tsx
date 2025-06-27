
import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

const StepIndicator = () => {
  return (
    <div className="text-center relative">
      {/* Background decoration - subtle like hero */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10">
        {/* Step indicators - much smaller on mobile */}
        <div className="inline-flex items-center gap-3 md:gap-8 mb-4 md:mb-12">
          {[
            { number: '1', color: 'emerald' },
            { number: '2', color: 'emerald' },
            { number: '3', color: 'emerald' }
          ].map((step, index) => (
            <React.Fragment key={index}>
              <div className="relative group">
                {/* Main circle - much smaller on mobile */}
                <div className="w-8 h-8 md:w-16 md:h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg group-hover:bg-emerald-600 transition-colors duration-300">
                  <span className="text-white text-sm md:text-xl font-bold">{step.number}</span>
                </div>
              </div>
              
              {index < 2 && (
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 md:w-6 md:h-6 text-slate-400" />
                  <div className="w-6 md:w-12 h-0.5 bg-slate-600"></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Title - much smaller on mobile */}
        <div className="relative">
          <h3 className="text-lg md:text-4xl lg:text-6xl font-bold text-white mb-3 md:mb-8 leading-tight">
            3 steps.{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              5 minutes.
            </span>
            {' '}
            <span className="inline-flex items-center gap-1 md:gap-3">
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                Done.
              </span>
              <Sparkles className="w-4 h-4 md:w-8 md:h-8 text-emerald-400" />
            </span>
          </h3>
          
          <p className="text-sm md:text-xl text-slate-300 max-w-3xl mx-auto">
            From first contact to fully working AI assistant in less than 5 minutes
          </p>
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
