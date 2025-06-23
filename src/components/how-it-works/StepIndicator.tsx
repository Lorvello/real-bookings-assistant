
import React from 'react';
import { ArrowRight } from 'lucide-react';

const StepIndicator = () => {
  return (
    <div className="text-center">
      {/* Step indicators */}
      <div className="inline-flex items-center gap-6 mb-8">
        {[
          { number: '1', active: true },
          { number: '2', active: false },
          { number: '3', active: false }
        ].map((step, index) => (
          <React.Fragment key={index}>
            <div className="relative group">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all duration-300 ${
                step.active 
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/25' 
                  : 'bg-slate-700 group-hover:bg-slate-600'
              }`}>
                {step.number}
              </div>
            </div>
            {index < 2 && (
              <ArrowRight className="w-5 h-5 text-slate-500" />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Title */}
      <div className="relative">
        <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight">
          3 stappen. 5 minuten.{' '}
          <span className="text-emerald-400">
            Klaar.
          </span>
        </h3>
      </div>
    </div>
  );
};

export default StepIndicator;
