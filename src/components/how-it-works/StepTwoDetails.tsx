
import React from 'react';
import { CheckCircle, Shield, Star, MessageSquare } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="relative">
      <div className="relative grid lg:grid-cols-2 gap-16 items-center">
        {/* Left side - Content */}
        <div className="space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-bold">2</span>
            </div>
            <div>
              <h3 className="text-3xl lg:text-4xl font-bold text-white mb-2">Kies je WhatsApp strategie</h3>
              <div className="flex items-center gap-2 text-emerald-400">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Flexibel & veilig</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            <div>
              <p className="text-xl text-slate-300 leading-relaxed mb-6">
                Je hebt twee opties om te starten. Wij zorgen ervoor dat alles naadloos werkt, 
                zonder dat jij iets technisch hoeft te doen.
              </p>
              
              <div className="border-l-4 border-emerald-400 pl-6">
                <div className="flex items-center gap-4 mb-3">
                  <Shield className="w-6 h-6 text-emerald-400" />
                  <span className="text-emerald-400 font-bold text-lg">100% veilig en GDPR-compliant</span>
                </div>
                <p className="text-slate-300">
                  Je WhatsApp gegevens blijven volledig privé.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="relative space-y-6">
          {/* Recommended option */}
          <div className="relative group">
            <div className="absolute -top-4 -right-4 z-10">
              <div className="bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
                <Star className="w-4 h-4" />
                Aanbevolen
              </div>
            </div>
            
            <div className="border border-emerald-500/30 rounded-3xl p-8">
              <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                Wij regelen een nummer voor je
              </h4>
              
              <div className="space-y-4 mb-6">
                {[
                  'Binnen 5 minuten live',
                  'Nederlands nummer', 
                  'Volledig beheerd door ons'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-sm text-slate-300">
                  <strong className="text-white">Perfect voor:</strong> Bedrijven die snel willen starten zonder gedoe.
                </p>
              </div>
            </div>
          </div>
          
          {/* Second option */}
          <div className="border border-slate-600 rounded-3xl p-8">
            <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-slate-400" />
              Je eigen nummer gebruiken
            </h4>
            
            <div className="space-y-4 mb-6">
              {[
                'Behoud je huidige nummer',
                'Klanten kennen het al',
                'Stap-voor-stap begeleiding'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <CheckCircle className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="bg-slate-700/20 border border-slate-600/30 rounded-xl p-4">
              <p className="text-sm text-slate-400">
                <strong className="text-slate-200">Perfect voor:</strong> Gevestigde bedrijven met een bekend WhatsApp nummer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepTwoDetails;
