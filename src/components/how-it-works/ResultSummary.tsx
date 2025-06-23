
import React from 'react';
import { CheckCircle } from 'lucide-react';

const ResultSummary = () => {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-10 lg:p-12 text-center">
      {/* Header */}
      <div className="flex items-center justify-center gap-6 mb-8">
        <CheckCircle className="w-12 h-12 text-emerald-400" />
        <span className="text-3xl lg:text-4xl font-bold text-white">Het resultaat:</span>
      </div>
      
      {/* Main description */}
      <p className="text-xl lg:text-2xl text-slate-200 leading-relaxed max-w-4xl mx-auto mb-12">
        Vanaf nu hoef jij <strong className="text-white bg-emerald-400/20 px-2 py-1 rounded-lg">nooit meer</strong> tijd te verspillen aan het heen-en-weer appen over afspraken. 
        Je krijgt <strong className="text-white bg-emerald-400/20 px-2 py-1 rounded-lg">meer boekingen</strong>, <strong className="text-white bg-emerald-400/20 px-2 py-1 rounded-lg">tevredener klanten</strong>, 
        en <strong className="text-white bg-emerald-400/20 px-2 py-1 rounded-lg">meer tijd</strong> voor wat echt belangrijk is.
      </p>
      
      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[
          { value: '95%', label: 'Minder tijd aan administratie' },
          { value: '24/7', label: 'Beschikbaar voor klanten' },
          { value: '0', label: 'Gemiste afspraken' },
          { value: '∞', label: 'Gelijktijdige gesprekken' }
        ].map((stat, index) => (
          <div key={index} className="bg-slate-800/40 border border-emerald-500/20 rounded-2xl p-6 lg:p-8">
            <div className="text-3xl lg:text-4xl font-bold text-emerald-400 mb-3">
              {stat.value}
            </div>
            <div className="text-sm lg:text-base text-slate-300 leading-tight">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultSummary;
