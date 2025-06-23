
import React from 'react';
import { ArrowRight } from 'lucide-react';

const StepIndicator = () => {
  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-xl font-bold">1</span>
        </div>
        <ArrowRight className="w-6 h-6 text-slate-400" />
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-xl font-bold">2</span>
        </div>
        <ArrowRight className="w-6 h-6 text-slate-400" />
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-700 to-green-700 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-xl font-bold">3</span>
        </div>
      </div>
      
      <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">
        3 stappen. 5 minuten. Klaar.
      </h3>
    </div>
  );
};

export default StepIndicator;
