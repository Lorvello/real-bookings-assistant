
import React from 'react';
import { CheckCircle, Shield, Star } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      {/* Left side - Content */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">2</span>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-white">Kies je WhatsApp strategie</h3>
        </div>
        
        <div className="space-y-6">
          <p className="text-slate-300 text-lg">
            Je hebt twee opties om te starten. Wij zorgen ervoor dat alles naadloos werkt, 
            zonder dat jij iets technisch hoeft te doen.
          </p>
          
          <div className="bg-slate-700/20 border border-slate-600/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 font-semibold">100% veilig en GDPR-compliant</span>
            </div>
            <p className="text-slate-300 text-sm">
              Je WhatsApp gegevens blijven volledig privé.
            </p>
          </div>
        </div>
      </div>
      
      {/* Right side - Visual */}
      <div className="space-y-4">
        {/* Recommended option */}
        <div className="relative">
          <div className="absolute -top-2 -right-2 z-10">
            <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
              <Star className="w-3 h-3" />
              Aanbevolen
            </div>
          </div>
          
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-white mb-3">Wij regelen een nummer voor je</h4>
            <div className="space-y-2 mb-4">
              {[
                'Binnen 5 minuten live',
                'Nederlands nummer', 
                'Volledig beheerd door ons'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-200 text-sm">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-emerald-300">
              <strong className="text-white">Perfect voor:</strong> Bedrijven die snel willen starten zonder gedoe.
            </p>
          </div>
        </div>
        
        {/* Second option */}
        <div className="bg-slate-800/40 border border-slate-600/40 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-white mb-3">Je eigen nummer gebruiken</h4>
          <div className="space-y-2 mb-4">
            {[
              'Behoud je huidige nummer',
              'Klanten kennen het al',
              'Stap-voor-stap begeleiding'
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400">
            <strong className="text-slate-200">Perfect voor:</strong> Gevestigde bedrijven met een bekend WhatsApp nummer.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StepTwoDetails;
