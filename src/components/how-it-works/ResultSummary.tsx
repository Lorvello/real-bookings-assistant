
import React from 'react';
import { CheckCircle, Sparkles, TrendingUp, Clock, Users, Zap } from 'lucide-react';

const ResultSummary = () => {
  return (
    <div className="relative">
      <div className="relative border border-slate-700 rounded-3xl p-12 lg:p-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-6 mb-8">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
            <div className="flex items-center gap-4">
              <span className="text-4xl lg:text-5xl font-bold text-white">The result:</span>
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
        </div>
        
        {/* Main description */}
        <div className="max-w-5xl mx-auto text-center mb-16">
          <p className="text-2xl lg:text-3xl text-slate-200 leading-relaxed mb-8">
            From now on, you{' '}
            <span className="text-red-400 font-bold">never again</span>
            {' '}have to waste time going back and forth messaging about appointments.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 text-xl lg:text-2xl text-slate-200">
            <span>You get</span>
            <span className="text-emerald-400 font-bold">more bookings</span>
            <span>,</span>
            <span className="text-emerald-400 font-bold">happier customers</span>
            <span>, and</span>
            <span className="text-emerald-400 font-bold">more time</span>
            <span>for what really matters.</span>
          </div>
        </div>
        
        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {[
            { 
              value: '95%', 
              label: 'Less time on administration', 
              icon: Clock
            },
            { 
              value: '24/7', 
              label: 'Available for customers', 
              icon: Users
            },
            { 
              value: '0', 
              label: 'Missed appointments', 
              icon: TrendingUp
            },
            { 
              value: '∞', 
              label: 'Simultaneous conversations', 
              icon: Zap
            }
          ].map((stat, index) => {
            const Icon = stat.icon;
            
            return (
              <div key={index} className="border border-slate-600 rounded-2xl p-8 lg:p-10 text-center">
                <Icon className="w-8 h-8 mx-auto text-emerald-400 mb-6" />
                
                <div className="text-4xl lg:text-5xl font-bold text-emerald-400 mb-4">
                  {stat.value}
                </div>
                
                <div className="text-sm lg:text-base text-slate-300 leading-tight">
                  {stat.label}
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
