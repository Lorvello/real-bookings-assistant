
import React from 'react';
import { CheckCircle, Calendar, Settings, Clock } from 'lucide-react';

const StepOneDetails = () => {
  return (
    <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-3xl p-12 backdrop-blur-sm">
      <div className="flex items-center gap-6 mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-white text-2xl font-bold">1</span>
        </div>
        <h4 className="text-3xl font-bold text-white">Vul je basisgegevens in</h4>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div>
          <h5 className="text-xl font-semibold text-emerald-300 mb-4">Wat heb je nodig?</h5>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Je bedrijfsnaam</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Website URL (optioneel)</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Email adres</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Type diensten die je aanbiedt</span>
            </li>
          </ul>
        </div>
        
        <div>
          <h5 className="text-xl font-semibold text-emerald-300 mb-4">Kalender verbinden</h5>
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-white">Optie 1: Gebruik onze kalender</span>
              </div>
              <p className="text-sm text-slate-300">Direct klaar om te gebruiken. Geen setup nodig.</p>
            </div>
            
            <div className="bg-slate-800/50 border border-slate-600/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="w-5 h-5 text-slate-400" />
                <span className="font-semibold text-white">Optie 2: Verbind je eigen kalender</span>
              </div>
              <p className="text-sm text-slate-300">Google Calendar, Outlook, Apple Calendar - alles wordt gesynchroniseerd.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <Clock className="w-6 h-6 text-emerald-400" />
          <span className="text-emerald-300 font-semibold text-lg">Tijd nodig: 2 minuten</span>
        </div>
        <p className="text-emerald-200">
          <strong className="text-white">Geen technische kennis vereist.</strong> Onze wizard begeleidt je door elke stap.
        </p>
      </div>
    </div>
  );
};

export default StepOneDetails;
