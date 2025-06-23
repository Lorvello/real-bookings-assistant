
import React from 'react';
import { MessageCircle, Calendar, Users, CheckCircle, Bot, Sparkles } from 'lucide-react';

const StepThreeDetails = () => {
  return (
    <div className="relative bg-gradient-to-r from-purple-500/5 to-purple-600/10 rounded-3xl p-8 border border-purple-500/20">
      {/* Background accent */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-400 to-purple-600 rounded-t-3xl"></div>
      
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left side - Content */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center shadow-xl border-2 border-purple-400">
              <span className="text-white text-xl font-bold">3</span>
            </div>
            <div>
              <h3 className="text-3xl lg:text-4xl font-bold text-white mb-2">Your assistant goes live</h3>
              <div className="flex items-center gap-2 text-purple-300">
                <Bot className="w-5 h-5" />
                <span className="text-base font-semibold">AI-powered</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <p className="text-lg text-slate-200 leading-relaxed font-medium">
              Ready for action. From now on, your customers can via WhatsApp:
            </p>
            
            <div className="space-y-3">
              {[
                'Book appointments (based on your calendar)',
                'Reschedule or cancel appointments',
                'Get immediate personal help, without waiting time'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-purple-500/30">
                  <CheckCircle className="w-5 h-5 text-purple-400 shrink-0" />
                  <span className="text-slate-200 font-medium">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="border-l-4 border-purple-400 pl-6 bg-purple-500/10 py-4 rounded-r-xl border border-purple-500/20">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <span className="text-purple-300 font-bold text-lg">Fully automated</span>
              </div>
              <p className="text-slate-300">
                You don't have to do anything yourself. Your smart assistant handles everything — 24/7, 
                fully automatic, in your style.
              </p>
            </div>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="space-y-4">
          {/* Feature cards */}
          <div className="grid gap-3">
            {[
              {
                icon: MessageCircle,
                title: 'Intelligent conversations',
                description: 'Natural conversations and understands customer context.',
                color: 'purple'
              },
              {
                icon: Calendar,
                title: 'Smart scheduling',
                description: 'Automatic availability check and optimal time slots.',
                color: 'purple'
              },
              {
                icon: Users,
                title: 'Personal service',
                description: 'Personalized attention for every customer.',
                color: 'purple'
              }
            ].map((card, index) => {
              const Icon = card.icon;
              
              return (
                <div key={index} className="border-2 border-purple-500/30 rounded-2xl p-5 bg-purple-500/10 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="w-5 h-5 text-purple-400" />
                    <h5 className="font-bold text-white">{card.title}</h5>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
          
          {/* Status indicator */}
          <div className="border-2 border-purple-400/50 rounded-2xl p-6 text-center bg-purple-500/10 backdrop-blur-sm">
            <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl border-2 border-purple-400">
              <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
            </div>
            
            <h4 className="font-bold text-white mb-2 flex items-center justify-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-400" />
              24/7 Active
            </h4>
            <p className="text-slate-300">Live and active since today</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepThreeDetails;
