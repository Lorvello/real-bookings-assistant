
import React from 'react';
import { MessageCircle, Calendar, Users, Zap } from 'lucide-react';

const StepThreeDetails = () => {
  return (
    <div className="bg-slate-800/50 rounded-2xl p-8 lg:p-12 border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center gap-6 mb-10">
        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <span className="text-white text-xl font-bold">3</span>
        </div>
        <h4 className="text-2xl lg:text-3xl font-bold text-white">Je assistent gaat live</h4>
      </div>
      
      {/* Feature cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {[
          {
            icon: MessageCircle,
            title: 'Intelligente gesprekken',
            description: 'Je AI assistent voert natuurlijke gesprekken en begrijpt context, vragen en wensen van klanten.',
            features: ['Detecteert urgentie', 'Herkent servicevoorkeuren', 'Stelt vervolgvragen']
          },
          {
            icon: Calendar,
            title: 'Slimme planning',
            description: 'Automatische beschikbaarheid check, dubbele boekingen voorkomen, en optimale tijdslots voorstellen.',
            features: ['Real-time agenda sync', 'Bufferijd berekening', 'Reistijd compensatie']
          },
          {
            icon: Users,
            title: 'Persoonlijke service',
            description: 'Elke klant krijgt gepersonaliseerde aandacht, zelfs van je AI assistent.',
            features: ['Klanthistorie onthouden', 'Voorkeuren bewaren', 'Persoonlijke tone-of-voice']
          }
        ].map((card, index) => {
          const Icon = card.icon;
          
          return (
            <div key={index} className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6">
              <Icon className="w-10 h-10 text-emerald-400 mb-4" />
              <h5 className="text-lg font-semibold text-white mb-3">{card.title}</h5>
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                {card.description}
              </p>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {card.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      
      {/* Bottom section */}
      <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-8 text-center">
        <div className="flex items-center justify-center gap-4 mb-6">
          <Zap className="w-8 h-8 text-emerald-400" />
          <span className="text-2xl font-bold text-white">Vanaf nu draait alles automatisch</span>
        </div>
        <p className="text-xl text-slate-200 leading-relaxed max-w-3xl mx-auto mb-8">
          <strong className="text-white">24/7 beschikbaar.</strong> Je klanten kunnen altijd afspraken maken, 
          vragen stellen, of bestaande afspraken wijzigen. <strong className="text-white">Zonder dat jij er bent.</strong>
        </p>
        
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="bg-slate-800/40 border border-emerald-500/20 rounded-xl p-5">
            <h6 className="font-semibold text-white mb-3">Wat gebeurt er automatisch?</h6>
            <ul className="text-sm text-slate-300 space-y-2">
              {[
                'Afspraken boeken en bevestigen',
                'Herinneringen versturen', 
                'Wijzigingen verwerken',
                'Vragen beantwoorden'
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-slate-800/40 border border-slate-600/20 rounded-xl p-5">
            <h6 className="font-semibold text-white mb-3">Wanneer word je ingeschakeld?</h6>
            <ul className="text-sm text-slate-300 space-y-2">
              {[
                'Complexe vragen',
                'Speciale verzoeken',
                'Klachten of problemen', 
                'Als klant erom vraagt'
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepThreeDetails;
