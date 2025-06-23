
import React from 'react';
import { CheckCircle, Calendar, Settings, Clock } from 'lucide-react';

const StepOneDetails = () => {
  return (
    <div className="bg-slate-800/50 rounded-2xl p-8 lg:p-12 border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center gap-6 mb-10">
        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <span className="text-white text-xl font-bold">1</span>
        </div>
        <h4 className="text-2xl lg:text-3xl font-bold text-white">Vul je basisgegevens in</h4>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-10 mb-10">
        {/* Left column - What you need */}
        <div className="space-y-6">
          <h5 className="text-xl font-semibold text-emerald-300 mb-6">Wat heb je nodig?</h5>
          <div className="space-y-4">
            {[
              'Je bedrijfsnaam',
              'Website URL (optioneel)', 
              'Email adres',
              'Type diensten die je aanbiedt'
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right column - Calendar options */}
        <div className="space-y-6">
          <h5 className="text-xl font-semibold text-emerald-300 mb-6">Kalender verbinden</h5>
          
          {/* Option 1 */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-white">Optie 1: Gebruik onze kalender</span>
            </div>
            <p className="text-sm text-slate-300">Direct klaar om te gebruiken. Geen setup nodig.</p>
          </div>
          
          {/* Option 2 */}
          <div className="bg-slate-800/30 border border-slate-600/30 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Settings className="w-5 h-5 text-slate-400" />
              <span className="font-semibold text-white">Optie 2: Verbind je eigen kalender</span>
            </div>
            <p className="text-sm text-slate-300">Google Calendar, Outlook, Apple Calendar - alles wordt gesynchroniseerd.</p>
          </div>
        </div>
      </div>
      
      {/* Time indicator */}
      <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-3">
          <Clock className="w-6 h-6 text-emerald-400" />
          <span className="text-emerald-300 font-semibold text-lg">Tijd nodig: 2 minuten</span>
        </div>
        <p className="text-emerald-200 leading-relaxed">
          <strong className="text-white">Geen technische kennis vereist.</strong> Onze wizard begeleidt je door elke stap.
        </p>
      </div>
    </div>
  );
};

export default StepOneDetails;
