
import React from 'react';
import { CheckCircle } from 'lucide-react';

const ResultSummary = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-3xl blur-sm"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-3xl p-10 lg:p-12 backdrop-blur-sm text-center">
        {/* Header */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="relative">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
            <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-lg"></div>
          </div>
          <span className="text-3xl lg:text-4xl font-bold text-white">Het resultaat:</span>
        </div>
        
        {/* Main description */}
        <p className="text-xl lg:text-2xl text-slate-200 leading-relaxed max-w-4xl mx-auto mb-12">
          Vanaf nu hoef jij <strong className="text-white bg-gradient-to-r from-emerald-400/20 to-green-400/20 px-2 py-1 rounded-lg">nooit meer</strong> tijd te verspillen aan het heen-en-weer appen over afspraken. 
          Je krijgt <strong className="text-white bg-gradient-to-r from-emerald-400/20 to-green-400/20 px-2 py-1 rounded-lg">meer boekingen</strong>, <strong className="text-white bg-gradient-to-r from-emerald-400/20 to-green-400/20 px-2 py-1 rounded-lg">tevredener klanten</strong>, 
          en <strong className="text-white bg-gradient-to-r from-emerald-400/20 to-green-400/20 px-2 py-1 rounded-lg">meer tijd</strong> voor wat echt belangrijk is.
        </p>
        
        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[
            { value: '95%', label: 'Minder tijd aan administratie', color: 'emerald' },
            { value: '24/7', label: 'Beschikbaar voor klanten', color: 'blue' },
            { value: '0', label: 'Gemiste afspraken', color: 'purple' },
            { value: '∞', label: 'Gelijktijdige gesprekken', color: 'green' }
          ].map((stat, index) => {
            const colorClasses = {
              emerald: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 text-emerald-400',
              blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
              purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400', 
              green: 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400'
            };
            
            return (
              <div key={index} className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[stat.color].split(' ')[0]} ${colorClasses[stat.color].split(' ')[1]} rounded-2xl blur-sm group-hover:blur-none transition-all duration-300`}></div>
                <div className={`relative bg-gradient-to-br ${colorClasses[stat.color].split(' ')[0]} ${colorClasses[stat.color].split(' ')[1]} border ${colorClasses[stat.color].split(' ')[2]} rounded-2xl p-6 lg:p-8 backdrop-blur-sm hover:border-opacity-50 transition-all duration-300 group-hover:scale-105`}>
                  <div className={`text-3xl lg:text-4xl font-bold ${colorClasses[stat.color].split(' ')[3]} mb-3 group-hover:scale-110 transition-all duration-300`}>
                    {stat.value}
                  </div>
                  <div className="text-sm lg:text-base text-slate-300 group-hover:text-slate-200 transition-colors duration-300 leading-tight">
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ResultSummary;
