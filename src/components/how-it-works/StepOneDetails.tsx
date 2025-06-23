
import React from 'react';
import { CheckCircle, Calendar, Settings, Clock } from 'lucide-react';

const StepOneDetails = () => {
  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      {/* Left side - Content */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">1</span>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-white">Vul je basisgegevens in</h3>
        </div>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-emerald-400 mb-4">Wat heb je nodig?</h4>
            <div className="space-y-3">
              {[
                'Je bedrijfsnaam',
                'Website URL (optioneel)', 
                'Email adres',
                'Type diensten die je aanbiedt'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Tijd nodig: 2 minuten</span>
            </div>
            <p className="text-slate-300 text-sm">
              Geen technische kennis vereist. Onze wizard begeleidt je door elke stap.
            </p>
          </div>
        </div>
      </div>
      
      {/* Right side - Visual */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-8">
        <h4 className="text-xl font-semibold text-emerald-400 mb-6">Kalender verbinden</h4>
        
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-white">Optie 1: Gebruik onze kalender</span>
            </div>
            <p className="text-sm text-slate-300">Direct klaar om te gebruiken. Geen setup nodig.</p>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-600/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Settings className="w-5 h-5 text-slate-400" />
              <span className="font-semibold text-white">Optie 2: Verbind je eigen kalender</span>
            </div>
            <p className="text-sm text-slate-300">Google Calendar, Outlook, Apple Calendar - alles wordt gesynchroniseerd.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepOneDetails;
