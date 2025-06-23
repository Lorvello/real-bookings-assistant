
import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

const StepIndicator = () => {
  return (
    <div className="text-center relative">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10">
        {/* Step indicators */}
        <div className="inline-flex items-center gap-8 mb-12">
          {[
            { number: '1', gradient: 'from-emerald-400 to-green-400', shadow: 'emerald' },
            { number: '2', gradient: 'from-blue-400 to-cyan-400', shadow: 'blue' },
            { number: '3', gradient: 'from-purple-400 to-pink-400', shadow: 'purple' }
          ].map((step, index) => (
            <React.Fragment key={index}>
              <div className="relative group">
                {/* Glow effect */}
                <div className={`absolute -inset-3 bg-gradient-to-r ${step.gradient} rounded-3xl blur-lg opacity-25 group-hover:opacity-50 transition-opacity duration-300`}></div>
                
                {/* Main circle */}
                <div className={`relative w-20 h-20 bg-gradient-to-br ${step.gradient} rounded-3xl flex items-center justify-center shadow-2xl shadow-${step.shadow}-500/25 group-hover:scale-110 transition-all duration-300 backdrop-blur-sm`}>
                  <span className="text-white text-2xl font-bold drop-shadow-lg">{step.number}</span>
                </div>
                
                {/* Pulse ring */}
                <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} rounded-3xl opacity-20 animate-ping`}></div>
              </div>
              
              {index < 2 && (
                <div className="relative group">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-8 h-8 text-slate-400 group-hover:text-slate-300 transition-all duration-300 group-hover:translate-x-1" />
                    <div className="w-16 h-0.5 bg-gradient-to-r from-slate-600 to-slate-500 group-hover:from-slate-500 group-hover:to-slate-400 transition-all duration-300"></div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Title */}
        <div className="relative">
          <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
            3 stappen.{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                5 minuten.
              </span>
              <div className="absolute inset-0 bg-blue-400/10 blur-lg rounded-lg"></div>
            </span>
            {' '}
            <span className="relative inline-flex items-center gap-3">
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                Klaar.
              </span>
              <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
              <div className="absolute inset-0 bg-emerald-400/10 blur-lg rounded-lg"></div>
            </span>
          </h3>
          
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Van eerste contact tot volledig werkende AI-assistent in nog geen 5 minuten
          </p>
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
