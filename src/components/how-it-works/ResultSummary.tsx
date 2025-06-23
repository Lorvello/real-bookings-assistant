
import React from 'react';
import { CheckCircle, Sparkles, TrendingUp, Clock, Users, Zap } from 'lucide-react';

const ResultSummary = () => {
  return (
    <div className="relative">
      {/* Background glow effects */}
      <div className="absolute -inset-8 bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-emerald-500/10 rounded-[3rem] blur-2xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-[3rem] p-12 lg:p-16 shadow-2xl">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-400 rounded-t-[3rem]"></div>
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="relative">
              <CheckCircle className="w-16 h-16 text-emerald-400" />
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl animate-pulse"></div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-4xl lg:text-5xl font-bold text-white">Het resultaat:</span>
              <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
          </div>
        </div>
        
        {/* Main description */}
        <div className="max-w-5xl mx-auto text-center mb-16">
          <p className="text-2xl lg:text-3xl text-slate-200 leading-relaxed mb-8">
            Vanaf nu hoef jij{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent font-bold">nooit meer</span>
              <div className="absolute inset-0 bg-red-400/10 blur-lg rounded-lg"></div>
            </span>
            {' '}tijd te verspillen aan het heen-en-weer appen over afspraken.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 text-xl lg:text-2xl text-slate-200">
            <span>Je krijgt</span>
            <span className="relative">
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent font-bold">meer boekingen</span>
              <div className="absolute inset-0 bg-emerald-400/10 blur-lg rounded-lg"></div>
            </span>
            <span>,</span>
            <span className="relative">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent font-bold">tevredener klanten</span>
              <div className="absolute inset-0 bg-blue-400/10 blur-lg rounded-lg"></div>
            </span>
            <span>, en</span>
            <span className="relative">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold">meer tijd</span>
              <div className="absolute inset-0 bg-purple-400/10 blur-lg rounded-lg"></div>
            </span>
            <span>voor wat echt belangrijk is.</span>
          </div>
        </div>
        
        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {[
            { 
              value: '95%', 
              label: 'Minder tijd aan administratie', 
              icon: Clock,
              gradient: 'from-emerald-400 to-green-400',
              bgGradient: 'from-emerald-500/20 to-green-500/20',
              borderColor: 'emerald-500/40'
            },
            { 
              value: '24/7', 
              label: 'Beschikbaar voor klanten', 
              icon: Users,
              gradient: 'from-blue-400 to-cyan-400',
              bgGradient: 'from-blue-500/20 to-cyan-500/20',
              borderColor: 'blue-500/40'
            },
            { 
              value: '0', 
              label: 'Gemiste afspraken', 
              icon: TrendingUp,
              gradient: 'from-purple-400 to-pink-400',
              bgGradient: 'from-purple-500/20 to-pink-500/20',
              borderColor: 'purple-500/40'
            },
            { 
              value: '∞', 
              label: 'Gelijktijdige gesprekken', 
              icon: Zap,
              gradient: 'from-amber-400 to-orange-400',
              bgGradient: 'from-amber-500/20 to-orange-500/20',
              borderColor: 'amber-500/40'
            }
          ].map((stat, index) => {
            const Icon = stat.icon;
            
            return (
              <div key={index} className="relative group">
                <div className={`absolute -inset-1 bg-gradient-to-r ${stat.gradient} rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity duration-300`}></div>
                <div className={`relative bg-gradient-to-br ${stat.bgGradient} border border-${stat.borderColor} rounded-3xl p-8 lg:p-10 backdrop-blur-sm group-hover:border-opacity-60 transition-all duration-300 group-hover:scale-105 shadow-xl`}>
                  <div className="text-center">
                    <div className="relative mb-6">
                      <Icon className={`w-8 h-8 mx-auto bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`} />
                      <div className="absolute inset-0 blur-sm opacity-50">
                        <Icon className={`w-8 h-8 mx-auto text-${stat.gradient.split('-')[1]}-400`} />
                      </div>
                    </div>
                    
                    <div className={`text-4xl lg:text-5xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-4 group-hover:scale-110 transition-all duration-300`}>
                      {stat.value}
                    </div>
                    
                    <div className="text-sm lg:text-base text-slate-300 group-hover:text-slate-200 transition-colors duration-300 leading-tight">
                      {stat.label}
                    </div>
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
