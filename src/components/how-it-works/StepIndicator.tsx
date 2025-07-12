
import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

const StepIndicator = () => {
  return (
    <div className="text-center relative">
      {/* Enhanced Background decoration */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-slate-700/5 to-slate-600/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10">
        {/* Sophisticated Step indicators with animations */}
        <div className="inline-flex items-center gap-4 md:gap-12 mb-8 md:mb-16">
          {[
            { number: '1', delay: '0ms' },
            { number: '2', delay: '150ms' },
            { number: '3', delay: '300ms' }
          ].map((step, index) => (
            <React.Fragment key={index}>
              <div 
                className="relative group animate-fade-in"
                style={{
                  animationDelay: step.delay,
                  animationFillMode: 'both'
                }}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                
                {/* Main circle with sophisticated gradient */}
                <div className="relative w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-2xl group-hover:shadow-emerald-500/25 transition-all duration-300 border border-emerald-500/20">
                  {/* Inner highlight */}
                  <div className="absolute inset-1 bg-gradient-to-br from-emerald-400/20 to-transparent rounded-full"></div>
                  <span className="relative text-white text-sm md:text-base font-bold z-10">{step.number}</span>
                </div>
              </div>
              
              {index < 2 && (
                <div 
                  className="flex items-center gap-2 animate-fade-in"
                  style={{
                    animationDelay: `${150 + index * 150}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  <ArrowRight className="w-4 h-4 md:w-8 md:h-8 text-slate-400" />
                  <div className="w-8 md:w-16 h-0.5 bg-gradient-to-r from-slate-600 to-slate-500"></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Enhanced Title with sophisticated typography */}
        <div className="relative">
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 md:mb-6 leading-tight tracking-tight">
            3 steps.{' '}
            <span className="bg-gradient-to-r from-slate-300 to-slate-100 bg-clip-text text-transparent">
              5 minutes.
            </span>
            {' '}
            <span className="inline-flex items-center gap-2">
              <span className="bg-gradient-to-r from-slate-300 to-slate-100 bg-clip-text text-transparent">
                Done.
              </span>
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-slate-400 animate-pulse" />
            </span>
          </h3>
          
          <p className="text-sm md:text-base text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
            From first contact to fully working AI assistant in less than 5 minutes
          </p>
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
