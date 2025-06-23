
import React from 'react';
import { CheckCircle } from 'lucide-react';

const ResultSummary = () => {
  return (
    <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/30 rounded-3xl p-10 backdrop-blur-sm text-center">
      <div className="flex items-center justify-center gap-4 mb-6">
        <CheckCircle className="w-12 h-12 text-emerald-400" />
        <span className="text-3xl font-bold text-white">Het resultaat:</span>
      </div>
      <p className="text-2xl text-slate-200 leading-relaxed max-w-4xl mx-auto mb-8">
        Vanaf nu hoef jij <strong className="text-white">nooit meer</strong> tijd te verspillen aan het heen-en-weer appen over afspraken. 
        Je krijgt <strong className="text-white">meer boekingen</strong>, <strong className="text-white">tevredener klanten</strong>, 
        en <strong className="text-white">meer tijd</strong> voor wat echt belangrijk is.
      </p>
      
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-6">
          <div className="text-3xl font-bold text-emerald-400 mb-2">95%</div>
          <div className="text-sm text-emerald-200">Minder tijd aan administratie</div>
        </div>
        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-6">
          <div className="text-3xl font-bold text-emerald-400 mb-2">24/7</div>
          <div className="text-sm text-emerald-200">Beschikbaar voor klanten</div>
        </div>
        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-6">
          <div className="text-3xl font-bold text-emerald-400 mb-2">0</div>
          <div className="text-sm text-emerald-200">Gemiste afspraken</div>
        </div>
        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-6">
          <div className="text-3xl font-bold text-emerald-400 mb-2">∞</div>
          <div className="text-sm text-emerald-200">Gelijktijdige gesprekken</div>
        </div>
      </div>
    </div>
  );
};

export default ResultSummary;
