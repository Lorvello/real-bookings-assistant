
import React from 'react';
import { MessageCircle, Calendar, Users, CheckCircle, Bot, Sparkles } from 'lucide-react';

const StepThreeDetails = () => {
  return (
    <div className="relative">
      <div className="grid lg:grid-cols-2 gap-6 md:gap-12 items-center">
        {/* Left side - Content */}
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-sm md:text-lg font-bold">3</span>
            </div>
            <div>
              <h3 className="text-lg md:text-2xl lg:text-3xl font-bold text-white mb-1">Your assistant goes live</h3>
              <div className="flex items-center gap-2 text-emerald-400">
                <Bot className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium">AI-powered</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 md:space-y-6">
            <p className="text-base md:text-lg text-slate-300 leading-relaxed">
              Ready for action. From now on, your customers can via WhatsApp:
            </p>
            
            <div className="space-y-2 md:space-y-3">
              {[
                'Book appointments (based on your calendar)',
                'Reschedule or cancel appointments',
                'Get immediate personal help, without waiting time'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 text-xs md:text-sm">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="border-l-4 border-emerald-400 pl-3 md:pl-4 bg-emerald-500/5 py-2 md:py-3 rounded-r-lg">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                <span className="text-emerald-400 font-bold text-sm md:text-base">Fully automated</span>
              </div>
              <p className="text-slate-300 text-xs md:text-sm">
                You don't have to do anything yourself. Your smart assistant handles everything — 24/7, 
                fully automatic, in your style.
              </p>
            </div>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="space-y-3 md:space-y-4">
          {/* Feature cards */}
          <div className="grid gap-2 md:gap-3">
            {[
              {
                icon: MessageCircle,
                title: 'Intelligent conversations',
                description: 'Natural conversations and understands customer context.',
                color: 'emerald'
              },
              {
                icon: Calendar,
                title: 'Smart scheduling',
                description: 'Automatic availability check and optimal time slots.',
                color: 'emerald'
              },
              {
                icon: Users,
                title: 'Personal service',
                description: 'Personalized attention for every customer.',
                color: 'emerald'
              }
            ].map((card, index) => {
              const Icon = card.icon;
              
              return (
                <div key={index} className="border border-slate-600 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
                    <h5 className="font-bold text-white text-xs md:text-sm">{card.title}</h5>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
          
          {/* Status indicator */}
          <div className="border border-emerald-500/30 rounded-xl p-4 md:p-6 text-center bg-emerald-500/5">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
              <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full"></div>
            </div>
            
            <h4 className="font-bold text-white mb-2 flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
              24/7 Active
            </h4>
            <p className="text-slate-300 text-xs md:text-sm">Live and active since today</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepThreeDetails;
