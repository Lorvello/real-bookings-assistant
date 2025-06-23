
import React from 'react';
import { CheckCircle, Calendar, Settings, Clock, Sparkles } from 'lucide-react';

const StepOneDetails = () => {
  return (
    <div className="relative">
      <div className="relative grid lg:grid-cols-2 gap-16 items-center">
        {/* Left side - Content */}
        <div className="space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-bold">1</span>
            </div>
            <div>
              <h3 className="text-3xl lg:text-4xl font-bold text-white mb-2">Vul je basisgegevens in</h3>
              <div className="flex items-center gap-2 text-emerald-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Super simpel</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8">
              <h4 className="text-xl font-semibold text-emerald-400 mb-6 flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                Wat heb je nodig?
              </h4>
              <div className="grid gap-4">
                {[
                  'Je bedrijfsnaam',
                  'Website URL (optioneel)', 
                  'Email adres',
                  'Type diensten die je aanbiedt'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4 group">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-3">
                <Clock className="w-6 h-6 text-emerald-400" />
                <span className="text-emerald-400 font-bold text-lg">Tijd nodig: 2 minuten</span>
              </div>
              <p className="text-slate-300">
                Geen technische kennis vereist. Onze wizard begeleidt je door elke stap.
              </p>
            </div>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="relative">
          <div className="relative bg-slate-800/60 border border-slate-700 rounded-3xl p-8 shadow-xl">
            <h4 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-emerald-400" />
              Kalender verbinden
            </h4>
            
            <div className="space-y-6">
              {/* Recommended option */}
              <div className="relative group">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold text-white">Optie 1: Gebruik onze kalender</span>
                    </div>
                    <div className="px-3 py-1 bg-emerald-400/20 rounded-full">
                      <span className="text-emerald-400 text-xs font-bold">AANBEVOLEN</span>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm mb-3">Direct klaar om te gebruiken. Geen setup nodig.</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-emerald-400 text-xs font-medium">Live in 30 seconden</span>
                  </div>
                </div>
              </div>
              
              {/* Second option */}
              <div className="bg-slate-700/50 border border-slate-600 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="w-5 h-5 text-slate-400" />
                  <span className="font-bold text-white">Optie 2: Verbind je eigen kalender</span>
                </div>
                <p className="text-slate-300 text-sm mb-3">Google Calendar, Outlook, Apple Calendar - alles wordt gesynchroniseerd.</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                  <span className="text-slate-400 text-xs font-medium">Setup in 2 minuten</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepOneDetails;
