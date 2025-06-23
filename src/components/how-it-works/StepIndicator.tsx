
import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

const StepIndicator = () => {
  return (
    <div className="text-center relative">
      {/* Background decoration - subtle like hero */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10">
        {/* Step indicators */}
        <div className="inline-flex items-center gap-8 mb-12">
          {[
            { number: '1', color: 'emerald' },
            { number: '2', color: 'emerald' },
            { number: '3', color: 'emerald' }
          ].map((step, index) => (
            <React.Fragment key={index}>
              <div className="relative group">
                {/* Main circle - clean and simple */}
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg group-hover:bg-emerald-600 transition-colors duration-300">
                  <span className="text-white text-xl font-bold">{step.number}</span>
                </div>
              </div>
              
              {index < 2 && (
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-6 h-6 text-slate-400" />
                  <div className="w-12 h-0.5 bg-slate-600"></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Title - matching hero style */}
        <div className="relative">
          <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
            3 stappen.{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              5 minuten.
            </span>
            {' '}
            <span className="inline-flex items-center gap-3">
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                Klaar.
              </span>
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </span>
          </h3>
          
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Van eerste contact tot volledig werkende AI-assistent in nog geen 5 minuten
          </p>
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
