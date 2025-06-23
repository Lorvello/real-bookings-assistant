
import React from 'react';
import { CheckCircle, Calendar, Settings, Clock } from 'lucide-react';

const StepOneDetails = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-3xl"></div>
      
      <div className="relative bg-slate-800/30 backdrop-blur-xl border border-slate-700/30 rounded-3xl p-8 lg:p-12">
        {/* Header */}
        <div className="flex items-center gap-6 mb-10">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <span className="text-white text-xl font-bold">1</span>
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-2xl blur-sm -z-10"></div>
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
                <div key={index} className="flex items-center gap-4 group">
                  <div className="relative">
                    <CheckCircle className="w-5 h-5 text-emerald-400 transition-all duration-300 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <span className="text-slate-300 group-hover:text-white transition-colors duration-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right column - Calendar options */}
          <div className="space-y-6">
            <h5 className="text-xl font-semibold text-emerald-300 mb-6">Kalender verbinden</h5>
            
            {/* Option 1 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-xl blur-sm group-hover:blur-none transition-all duration-300"></div>
              <div className="relative bg-slate-800/50 border border-emerald-500/20 rounded-xl p-5 backdrop-blur-sm hover:border-emerald-500/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-white">Optie 1: Gebruik onze kalender</span>
                </div>
                <p className="text-sm text-slate-300">Direct klaar om te gebruiken. Geen setup nodig.</p>
              </div>
            </div>
            
            {/* Option 2 */}
            <div className="relative group">
              <div className="relative bg-slate-800/30 border border-slate-600/30 rounded-xl p-5 backdrop-blur-sm hover:border-slate-500/50 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <Settings className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-white">Optie 2: Verbind je eigen kalender</span>
                </div>
                <p className="text-sm text-slate-300">Google Calendar, Outlook, Apple Calendar - alles wordt gesynchroniseerd.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Time indicator */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-2xl blur-sm"></div>
          <div className="relative bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-3">
              <div className="relative">
                <Clock className="w-6 h-6 text-emerald-400" />
                <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-sm"></div>
              </div>
              <span className="text-emerald-300 font-semibold text-lg">Tijd nodig: 2 minuten</span>
            </div>
            <p className="text-emerald-200 leading-relaxed">
              <strong className="text-white">Geen technische kennis vereist.</strong> Onze wizard begeleidt je door elke stap.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepOneDetails;
