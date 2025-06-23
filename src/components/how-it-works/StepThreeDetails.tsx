
import React from 'react';
import { MessageCircle, Calendar, Users, CheckCircle, Bot, Sparkles } from 'lucide-react';

const StepThreeDetails = () => {
  return (
    <div className="relative">
      <div className="relative grid lg:grid-cols-2 gap-16 items-center">
        {/* Left side - Content */}
        <div className="space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-bold">3</span>
            </div>
            <div>
              <h3 className="text-3xl lg:text-4xl font-bold text-white mb-2">Je assistent gaat live</h3>
              <div className="flex items-center gap-2 text-emerald-400">
                <Bot className="w-4 h-4" />
                <span className="text-sm font-medium">AI-powered</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8">
              <p className="text-xl text-slate-300 leading-relaxed mb-8">
                Klaar voor actie. Vanaf nu kunnen je klanten via WhatsApp:
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  'Afspraken boeken (op basis van je kalender)',
                  'Afspraken verzetten of annuleren',
                  'Direct persoonlijke hulp krijgen, zonder wachttijd'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-3">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                  <span className="text-emerald-400 font-bold text-lg">Volledig geautomatiseerd</span>
                </div>
                <p className="text-slate-300">
                  Je hoeft zelf niets te doen. Je slimme assistent regelt alles — 24/7, 
                  volledig automatisch, in jouw stijl.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="relative space-y-6">
          {/* Feature cards */}
          <div className="grid gap-4">
            {[
              {
                icon: MessageCircle,
                title: 'Intelligente gesprekken',
                description: 'Natuurlijke gesprekken en begrijpt context van klanten.',
                color: 'emerald'
              },
              {
                icon: Calendar,
                title: 'Slimme planning',
                description: 'Automatische beschikbaarheid check en optimale tijdslots.',
                color: 'emerald'
              },
              {
                icon: Users,
                title: 'Persoonlijke service',
                description: 'Gepersonaliseerde aandacht voor elke klant.',
                color: 'emerald'
              }
            ].map((card, index) => {
              const Icon = card.icon;
              
              return (
                <div key={index} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Icon className="w-6 h-6 text-emerald-400" />
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
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-8 text-center shadow-xl">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            
            <h4 className="font-bold text-white mb-3 text-xl flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              24/7 Actief
            </h4>
            <p className="text-slate-300">Live en actief sinds vandaag</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepThreeDetails;
