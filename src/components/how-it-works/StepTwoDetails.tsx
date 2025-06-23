
import React from 'react';
import { CheckCircle, Shield } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="bg-slate-800/50 rounded-2xl p-8 lg:p-12 border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center gap-6 mb-10">
        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <span className="text-white text-xl font-bold">2</span>
        </div>
        <h4 className="text-2xl lg:text-3xl font-bold text-white">Kies je WhatsApp strategie</h4>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-10 mb-10">
        {/* Left column - Options */}
        <div className="space-y-6">
          {/* Recommended option */}
          <div className="relative">
            <div className="absolute -top-3 -right-3 z-10">
              <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-emerald-500/25">
                Aanbevolen
              </div>
            </div>
            
            <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-6">
              <h5 className="text-xl font-semibold text-white mb-4">Wij regelen een nummer voor je</h5>
              <div className="space-y-3 mb-4">
                {[
                  'Binnen 5 minuten live',
                  'Nederlands nummer', 
                  'Volledig beheerd door ons'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-200">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-emerald-300">
                <strong className="text-white">Perfect voor:</strong> Bedrijven die snel willen starten zonder gedoe.
              </p>
            </div>
          </div>
          
          {/* Second option */}
          <div className="bg-slate-800/40 border border-slate-600/40 rounded-2xl p-6">
            <h5 className="text-xl font-semibold text-white mb-4">Je eigen nummer gebruiken</h5>
            <div className="space-y-3 mb-4">
              {[
                'Behoud je huidige nummer',
                'Klanten kennen het al',
                'Stap-voor-stap begeleiding'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-400">
              <strong className="text-slate-200">Perfect voor:</strong> Gevestigde bedrijven met een bekend WhatsApp nummer.
            </p>
          </div>
        </div>
        
        {/* Right column - Integration process */}
        <div className="space-y-6">
          <h5 className="text-xl font-semibold text-slate-300 mb-6">Hoe werkt de integratie?</h5>
          <div className="space-y-5">
            {[
              {
                step: '1',
                title: 'Veilige verbinding',
                description: 'We maken een beveiligde API-verbinding met WhatsApp Business.'
              },
              {
                step: '2', 
                title: 'AI training',
                description: 'Onze AI leert je bedrijfsstijl en services kennen.'
              },
              {
                step: '3',
                title: 'Testing',
                description: 'We testen alles grondig voordat het live gaat.'
              }
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-500/25">
                  {item.step}
                </div>
                <div className="space-y-1">
                  <h6 className="font-semibold text-white">{item.title}</h6>
                  <p className="text-sm text-slate-300">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Time and security indicator */}
      <div className="bg-slate-700/20 border border-slate-600/30 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-3">
          <Shield className="w-6 h-6 text-slate-400" />
          <span className="text-slate-300 font-semibold text-lg">Tijd nodig: 2-3 minuten</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          <strong className="text-white">100% veilig en GDPR-compliant.</strong> Je WhatsApp gegevens blijven volledig privé.
        </p>
      </div>
    </div>
  );
};

export default StepTwoDetails;
