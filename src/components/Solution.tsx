
import { Button } from "@/components/ui/button";
import { MessageCircle, Brain, Target, Clock, Users, TrendingUp } from "lucide-react";

const Solution = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-6 py-3 mb-8 backdrop-blur-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 text-sm font-medium">De Oplossing</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Ontmoet Je <span className="text-emerald-400">24/7</span><br />
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Boekings Assistent
            </span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            De AI die nooit slaapt, nooit een lead mist, en afspraken boekt 
            sneller dan welke mens dan ook.
          </p>
        </div>
        
        {/* Main features grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {/* Feature 1 */}
          <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <MessageCircle className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              Directe WhatsApp Antwoorden
            </h3>
            <p className="text-slate-300 leading-relaxed mb-6">
              Reageert binnen seconden op elk bericht, 24/7. Je klanten krijgen direct antwoord 
              op hun vragen en beschikbare tijdslots.
            </p>
            <div className="flex items-center text-emerald-400 font-semibold">
              <Clock className="w-5 h-5 mr-2" />
              <span>Gemiddelde reactie: 3 seconden</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Brain className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              Slimme Gespreksvoering
            </h3>
            <p className="text-slate-300 leading-relaxed mb-6">
              Begrijpt context, stelt de juiste vragen, en begeleidt klanten 
              naar het perfecte afspraaktijdstip dat voor iedereen werkt.
            </p>
            <div className="flex items-center text-blue-400 font-semibold">
              <Users className="w-5 h-5 mr-2" />
              <span>98% klanttevredenheid</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Target className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              Perfect Voor Elk Bedrijf
            </h3>
            <p className="text-slate-300 leading-relaxed mb-6">
              Salons, klinieken, fitnessstudio's, consultants - als je afspraken boekt, 
              past onze AI zich aan je specifieke bedrijfsbehoeften aan.
            </p>
            <div className="flex items-center text-purple-400 font-semibold">
              <TrendingUp className="w-5 h-5 mr-2" />
              <span>300% meer boekingen gem.</span>
            </div>
          </div>
        </div>

        {/* Stats section */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center">
          <h3 className="text-3xl font-bold text-white mb-8">
            De Cijfers Liegen Niet
          </h3>
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold text-emerald-400 mb-2">24/7</div>
              <div className="text-slate-300">Altijd Beschikbaar</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-400 mb-2">3s</div>
              <div className="text-slate-300">Gemiddelde Reactie</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-400 mb-2">300%</div>
              <div className="text-slate-300">Meer Boekingen</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-400 mb-2">0%</div>
              <div className="text-slate-300">Menselijke Fouten</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solution;
