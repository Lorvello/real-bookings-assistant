
import React from 'react';
import { MessageCircle, Calendar, Users, Zap } from 'lucide-react';

const StepThreeDetails = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-3xl"></div>
      
      <div className="relative bg-slate-800/30 backdrop-blur-xl border border-slate-700/30 rounded-3xl p-8 lg:p-12">
        {/* Header */}
        <div className="flex items-center gap-6 mb-10">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <span className="text-white text-xl font-bold">3</span>
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl blur-sm -z-10"></div>
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
              features: ['Detecteert urgentie', 'Herkent servicevoorkeuren', 'Stelt vervolgvragen'],
              color: 'emerald'
            },
            {
              icon: Calendar,
              title: 'Slimme planning',
              description: 'Automatische beschikbaarheid check, dubbele boekingen voorkomen, en optimale tijdslots voorstellen.',
              features: ['Real-time agenda sync', 'Bufferijd berekening', 'Reistijd compensatie'],
              color: 'blue'
            },
            {
              icon: Users,
              title: 'Persoonlijke service',
              description: 'Elke klant krijgt gepersonaliseerde aandacht, zelfs van je AI assistent.',
              features: ['Klanthistorie onthouden', 'Voorkeuren bewaren', 'Persoonlijke tone-of-voice'],
              color: 'purple'
            }
          ].map((card, index) => {
            const Icon = card.icon;
            const colorClasses = {
              emerald: 'from-emerald-500/10 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
              blue: 'from-blue-500/10 to-blue-600/10 border-blue-500/20 text-blue-400', 
              purple: 'from-purple-500/10 to-purple-600/10 border-purple-500/20 text-purple-400'
            };
            
            return (
              <div key={index} className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[card.color].split(' ')[0]} ${colorClasses[card.color].split(' ')[1]} rounded-xl blur-sm group-hover:blur-none transition-all duration-300`}></div>
                <div className={`relative bg-gradient-to-br ${colorClasses[card.color].split(' ')[0]} ${colorClasses[card.color].split(' ')[1]} border ${colorClasses[card.color].split(' ')[2]} rounded-xl p-6 backdrop-blur-sm hover:border-opacity-40 transition-all duration-300`}>
                  <div className="relative mb-4">
                    <Icon className={`w-10 h-10 ${colorClasses[card.color].split(' ')[3]} group-hover:scale-110 transition-all duration-300`} />
                    <div className={`absolute inset-0 bg-current opacity-20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                  </div>
                  <h5 className="text-lg font-semibold text-white mb-3 group-hover:text-opacity-90 transition-colors duration-300">{card.title}</h5>
                  <p className="text-sm text-slate-300 mb-4 leading-relaxed group-hover:text-slate-200 transition-colors duration-300">
                    {card.description}
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {card.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2 group-hover:text-slate-300 transition-colors duration-300">
                        <div className="w-1 h-1 bg-current rounded-full opacity-60"></div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Bottom section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-purple-500/10 rounded-2xl blur-sm"></div>
          <div className="relative bg-gradient-to-r from-emerald-500/10 to-purple-500/10 border border-emerald-400/20 rounded-2xl p-8 backdrop-blur-sm text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="relative">
                <Zap className="w-8 h-8 text-emerald-400" />
                <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-md"></div>
              </div>
              <span className="text-2xl font-bold text-white">Vanaf nu draait alles automatisch</span>
            </div>
            <p className="text-xl text-slate-200 leading-relaxed max-w-3xl mx-auto mb-8">
              <strong className="text-white">24/7 beschikbaar.</strong> Je klanten kunnen altijd afspraken maken, 
              vragen stellen, of bestaande afspraken wijzigen. <strong className="text-white">Zonder dat jij er bent.</strong>
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-slate-800/30 rounded-xl blur-sm group-hover:blur-none transition-all duration-300"></div>
                <div className="relative bg-slate-800/40 border border-emerald-500/20 rounded-xl p-5 backdrop-blur-sm hover:border-emerald-500/40 transition-all duration-300">
                  <h6 className="font-semibold text-white mb-3 group-hover:text-emerald-200 transition-colors duration-300">Wat gebeurt er automatisch?</h6>
                  <ul className="text-sm text-slate-300 space-y-2">
                    {[
                      'Afspraken boeken en bevestigen',
                      'Herinneringen versturen', 
                      'Wijzigingen verwerken',
                      'Vragen beantwoorden'
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-3 group-hover:text-slate-200 transition-colors duration-300">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-0 bg-slate-800/30 rounded-xl blur-sm group-hover:blur-none transition-all duration-300"></div>
                <div className="relative bg-slate-800/40 border border-purple-500/20 rounded-xl p-5 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300">
                  <h6 className="font-semibold text-white mb-3 group-hover:text-purple-200 transition-colors duration-300">Wanneer word je ingeschakeld?</h6>
                  <ul className="text-sm text-slate-300 space-y-2">
                    {[
                      'Complexe vragen',
                      'Speciale verzoeken',
                      'Klachten of problemen', 
                      'Als klant erom vraagt'
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-3 group-hover:text-slate-200 transition-colors duration-300">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepThreeDetails;
