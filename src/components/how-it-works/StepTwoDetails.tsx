
import React from 'react';
import { CheckCircle, Shield, Star, MessageSquare, Zap } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="relative">
      {/* Background glow effects */}
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10 rounded-3xl blur-xl"></div>
      
      <div className="relative grid lg:grid-cols-2 gap-16 items-center">
        {/* Left side - Content */}
        <div className="space-y-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/25">
                <span className="text-white text-2xl font-bold">2</span>
              </div>
              <div className="absolute -inset-2 bg-blue-400/20 rounded-2xl blur-lg animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-3xl lg:text-4xl font-bold text-white mb-2">Kies je WhatsApp strategie</h3>
              <div className="flex items-center gap-2 text-blue-400">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Flexibel & veilig</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
              <p className="text-xl text-slate-300 leading-relaxed mb-6">
                Je hebt twee opties om te starten. Wij zorgen ervoor dat alles naadloos werkt, 
                zonder dat jij iets technisch hoeft te doen.
              </p>
              
              <div className="relative overflow-hidden bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-400"></div>
                <div className="flex items-center gap-4 mb-3">
                  <Shield className="w-6 h-6 text-blue-400" />
                  <span className="text-blue-400 font-bold text-lg">100% veilig en GDPR-compliant</span>
                </div>
                <p className="text-slate-300">
                  Je WhatsApp gegevens blijven volledig privé.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-3xl blur-xl"></div>
          
          <div className="relative space-y-6">
            {/* Recommended option */}
            <div className="relative group">
              <div className="absolute -top-4 -right-4 z-10">
                <div className="bg-gradient-to-r from-emerald-400 to-green-400 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl">
                  <Star className="w-4 h-4" />
                  Aanbevolen
                </div>
              </div>
              
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-green-400 rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/40 rounded-3xl p-8 backdrop-blur-xl shadow-2xl group-hover:border-emerald-400/60 transition-all duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-400 rounded-t-3xl"></div>
                
                <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  Wij regelen een nummer voor je
                </h4>
                
                <div className="space-y-4 mb-6">
                  {[
                    'Binnen 5 minuten live',
                    'Nederlands nummer', 
                    'Volledig beheerd door ons'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-4 group">
                      <div className="relative">
                        <CheckCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform duration-200" />
                        <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      </div>
                      <span className="text-emerald-200 group-hover:text-white transition-colors duration-200">{item}</span>
                    </div>
                  ))}
                </div>
                
                <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-4">
                  <p className="text-sm text-emerald-300">
                    <strong className="text-white">Perfect voor:</strong> Bedrijven die snel willen starten zonder gedoe.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Second option */}
            <div className="relative group">
              <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-xl group-hover:border-slate-600/70 transition-all duration-300">
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
                    <div key={index} className="flex items-center gap-4 group">
                      <CheckCircle className="w-5 h-5 text-slate-400 group-hover:text-slate-300 transition-colors duration-200" />
                      <span className="text-slate-300 group-hover:text-white transition-colors duration-200">{item}</span>
                    </div>
                  ))}
                </div>
                
                <div className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-4">
                  <p className="text-sm text-slate-400">
                    <strong className="text-slate-200">Perfect voor:</strong> Gevestigde bedrijven met een bekend WhatsApp nummer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepTwoDetails;
