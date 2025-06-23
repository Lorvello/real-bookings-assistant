
import React from 'react';
import { MessageCircle, Calendar, Users, Zap, CheckCircle } from 'lucide-react';

const StepThreeDetails = () => {
  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      {/* Left side - Content */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">3</span>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-white">Je assistent gaat live</h3>
        </div>
        
        <div className="space-y-6">
          <p className="text-slate-300 text-lg">
            Klaar voor actie. Vanaf nu kunnen je klanten via WhatsApp:
          </p>
          
          <div className="space-y-3">
            {[
              'Afspraken boeken (op basis van je kalender)',
              'Afspraken verzetten of annuleren',
              'Direct persoonlijke hulp krijgen, zonder wachttijd'
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
          
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 font-semibold">Volledig geautomatiseerd</span>
            </div>
            <p className="text-slate-300 text-sm">
              Je hoeft zelf niets te doen. Je slimme assistent regelt alles — 24/7, 
              volledig automatisch, in jouw stijl.
            </p>
          </div>
        </div>
      </div>
      
      {/* Right side - Visual */}
      <div className="space-y-6">
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
              color: 'blue'
            },
            {
              icon: Users,
              title: 'Persoonlijke service',
              description: 'Gepersonaliseerde aandacht voor elke klant.',
              color: 'purple'
            }
          ].map((card, index) => {
            const Icon = card.icon;
            const colorClasses = {
              emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
              blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20', 
              purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
            };
            
            return (
              <div key={index} className={`${colorClasses[card.color].split(' ')[1]} border ${colorClasses[card.color].split(' ')[2]} rounded-xl p-4`}>
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`w-5 h-5 ${colorClasses[card.color].split(' ')[0]}`} />
                  <h5 className="font-semibold text-white text-sm">{card.title}</h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
        
        <div className="bg-slate-800/30 border border-slate-600/30 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          </div>
          <h4 className="font-semibold text-white mb-2">24/7 Actief</h4>
          <p className="text-sm text-slate-300">Live en actief sinds vandaag</p>
        </div>
      </div>
    </div>
  );
};

export default StepThreeDetails;
