
import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const StepIndicator = () => {
  const { t } = useTranslation();
  
  return (
    <div className="text-center relative py-12 md:py-16">
      {/* Enhanced Background decoration with emerald accents */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-emerald-600/10 via-emerald-500/5 to-emerald-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-tl from-emerald-400/20 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="relative z-10">
        {/* Premium Step indicators with enhanced animations */}
        <div className="inline-flex items-center gap-4 md:gap-16 mb-6 md:mb-10">
          {[
            { number: '1', delay: '0ms', title: t('howItWorks.stepIndicator.steps.connect') },
            { number: '2', delay: '200ms', title: t('howItWorks.stepIndicator.steps.setup') },
            { number: '3', delay: '400ms', title: t('howItWorks.stepIndicator.steps.launch') }
          ].map((step, index) => (
            <React.Fragment key={index}>
              <div 
                className="relative group animate-fade-in flex flex-col items-center"
                style={{
                  animationDelay: step.delay,
                  animationFillMode: 'both'
                }}
              >
                {/* Outer glow ring */}
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/30 via-emerald-400/20 to-emerald-600/30 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-all duration-500"></div>
                
                {/* Main circle with premium gradient */}
                <div className="relative w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/25 group-hover:shadow-emerald-400/40 hover:scale-110 transition-all duration-500 border border-emerald-300/50">
                  {/* Inner gradient overlay */}
                  <div className="absolute inset-1 bg-gradient-to-br from-emerald-200/30 via-transparent to-emerald-800/30 rounded-full"></div>
                  
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-300/50 animate-ping opacity-20"></div>
                  
                  <span className="relative text-white text-base md:text-xl font-bold z-10 drop-shadow-lg">{step.number}</span>
                </div>
                
                {/* Step label */}
                <span className="mt-2 md:mt-3 text-xs md:text-base font-semibold bg-gradient-to-r from-emerald-300 to-emerald-400 bg-clip-text text-transparent">
                  {step.title}
                </span>
              </div>
              
              {index < 2 && (
                <div 
                  className="flex items-center animate-fade-in"
                  style={{
                    animationDelay: `${100 + index * 200}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  {/* Enhanced connecting line */}
                  <div className="relative w-8 md:w-20 h-1 bg-gradient-to-r from-emerald-500/30 via-emerald-400/50 to-emerald-500/30 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent w-6 animate-[pulse_2s_ease-in-out_infinite] rounded-full"></div>
                  </div>
                  
                  {/* Arrow head */}
                  <div className="ml-1">
                    <div className="w-0 h-0 border-l-[8px] border-l-emerald-400/70 border-t-[5px] border-b-[5px] border-t-transparent border-b-transparent drop-shadow-sm"></div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Enhanced Title with premium typography */}
        <div className="relative">
          <div className="flex items-center justify-center mb-6">
            {/* Left sparkle */}
            <div className="w-4 h-4 md:w-8 md:h-8 text-emerald-400 animate-spin mr-4" style={{ animationDuration: '3s' }}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.09 8.26L22 5L14.09 8.26L12 0ZM0 12L8.26 9.91L5 2L8.26 9.91L0 12ZM12 24L9.91 15.74L2 19L9.91 15.74L12 24ZM24 12L15.74 14.09L19 22L15.74 14.09L24 12Z"/>
              </svg>
            </div>
            
            <h3 className="text-3xl md:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-emerald-300 via-emerald-200 to-emerald-400 bg-clip-text text-transparent drop-shadow-2xl tracking-tight">
              {t('howItWorks.stepIndicator.title')}
            </h3>
            
            {/* Right sparkle */}
            <div className="w-4 h-4 md:w-8 md:h-8 text-emerald-400 animate-spin ml-4" style={{ animationDuration: '3s', animationDelay: '1.5s' }}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.09 8.26L22 5L14.09 8.26L12 0ZM0 12L8.26 9.91L5 2L8.26 9.91L0 12ZM12 24L9.91 15.74L2 19L9.91 15.74L12 24ZM24 12L15.74 14.09L19 22L15.74 14.09L24 12Z"/>
              </svg>
            </div>
          </div>
          
          <p className="text-xs md:text-lg text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
            {t('howItWorks.stepIndicator.subtitle')} 
            <span className="bg-gradient-to-r from-emerald-300 to-emerald-400 bg-clip-text text-transparent font-semibold"> {t('howItWorks.stepIndicator.subtitleAccent')}</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
