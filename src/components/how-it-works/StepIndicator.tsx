
import React from 'react';
import { ArrowRight } from 'lucide-react';

const StepIndicator = () => {
  return (
    <div className="text-center">
      {/* Step indicators */}
      <div className="inline-flex items-center gap-6 mb-8">
        {[
          { number: '1', colors: 'from-emerald-500 to-green-500' },
          { number: '2', colors: 'from-blue-500 to-blue-600' },
          { number: '3', colors: 'from-purple-500 to-purple-600' }
        ].map((step, index) => (
          <React.Fragment key={index}>
            <div className="relative group">
              <div className={`w-14 h-14 bg-gradient-to-br ${step.colors} rounded-2xl flex items-center justify-center shadow-lg shadow-${step.colors.split('-')[1]}-500/25 group-hover:scale-110 transition-all duration-300`}>
                <span className="text-white text-xl font-bold">{step.number}</span>
              </div>
              <div className={`absolute -inset-1 bg-gradient-to-br ${step.colors} opacity-20 rounded-2xl blur-sm group-hover:blur-md group-hover:opacity-40 transition-all duration-300 -z-10`}></div>
            </div>
            {index < 2 && (
              <div className="relative">
                <ArrowRight className="w-6 h-6 text-slate-400 transition-all duration-300 hover:text-slate-300" />
                <div className="absolute inset-0 bg-slate-400/10 rounded-full blur-sm opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Title */}
      <div className="relative">
        <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight">
          3 stappen. 5 minuten.{' '}
          <span className="relative">
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Klaar.
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 blur-lg -z-10"></div>
          </span>
        </h3>
      </div>
    </div>
  );
};

export default StepIndicator;
