
import React from 'react';
import { CheckCircle, Shield } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-slate-600/30 rounded-3xl p-12 backdrop-blur-sm">
      <div className="flex items-center gap-6 mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-white text-2xl font-bold">2</span>
        </div>
        <h4 className="text-3xl font-bold text-white">Kies je WhatsApp strategie</h4>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/40 rounded-2xl p-6 relative">
            <div className="absolute -top-3 -right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              Aanbevolen
            </div>
            <h5 className="text-xl font-semibold text-white mb-3">Wij regelen een nummer voor je</h5>
            <ul className="space-y-2 text-emerald-200 mb-4">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Binnen 5 minuten live</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Nederlands nummer</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Volledig beheerd door ons</span>
              </li>
            </ul>
            <p className="text-sm text-emerald-300">
              <strong>Perfect voor:</strong> Bedrijven die snel willen starten zonder gedoe.
            </p>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-600/50 rounded-2xl p-6">
            <h5 className="text-xl font-semibold text-white mb-3">Je eigen nummer gebruiken</h5>
            <ul className="space-y-2 text-slate-300 mb-4">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-slate-400" />
                <span>Behoud je huidige nummer</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-slate-400" />
                <span>Klanten kennen het al</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-slate-400" />
                <span>Stap-voor-stap begeleiding</span>
              </li>
            </ul>
            <p className="text-sm text-slate-400">
              <strong>Perfect voor:</strong> Gevestigde bedrijven met een bekend WhatsApp nummer.
            </p>
          </div>
        </div>
        
        <div>
          <h5 className="text-xl font-semibold text-slate-300 mb-6">Hoe werkt de integratie?</h5>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h6 className="font-semibold text-white mb-1">Veilige verbinding</h6>
                <p className="text-sm text-slate-300">We maken een beveiligde API-verbinding met WhatsApp Business.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h6 className="font-semibold text-white mb-1">AI training</h6>
                <p className="text-sm text-slate-300">Onze AI leert je bedrijfsstijl en services kennen.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h6 className="font-semibold text-white mb-1">Testing</h6>
                <p className="text-sm text-slate-300">We testen alles grondig voordat het live gaat.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-700/30 border border-slate-600/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-6 h-6 text-slate-400" />
          <span className="text-slate-300 font-semibold text-lg">Tijd nodig: 2-3 minuten</span>
        </div>
        <p className="text-slate-300">
          <strong className="text-white">100% veilig en GDPR-compliant.</strong> Je WhatsApp gegevens blijven volledig privé.
        </p>
      </div>
    </div>
  );
};

export default StepTwoDetails;
