
import { Button } from "@/components/ui/button";
import { MessageCircle, Brain, Target, Clock, Users, TrendingUp } from "lucide-react";

const Solution = () => {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 sm:px-6 py-2 sm:py-3 mb-6 sm:mb-8 backdrop-blur-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 text-xs sm:text-sm font-medium">De Oplossing</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight px-4 sm:px-0">
            Ontmoet Je <span className="text-emerald-400">24/7</span><br />
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Boekings Assistent
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
            De AI die nooit slaapt, nooit een lead mist, en afspraken boekt 
            sneller dan welke mens dan ook.
          </p>
        </div>
        
        {/* Clean features grid - responsive design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 sm:gap-16">
          {/* Feature 1 - Clean design */}
          <div className="group text-center hover:transform hover:scale-105 transition-all duration-300 cursor-pointer px-4 sm:px-0">
            <div className="relative mb-6 sm:mb-8 flex justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
              </div>
              <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 leading-tight group-hover:text-emerald-300 transition-colors duration-300">
              Directe WhatsApp Antwoorden
            </h3>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-sm mx-auto group-hover:text-slate-200 transition-colors duration-300 mb-4 sm:mb-6">
              Reageert binnen seconden op elk bericht, 24/7. Je klanten krijgen direct antwoord 
              op hun vragen en beschikbare tijdslots.
            </p>
            <div className="flex items-center justify-center text-emerald-400 font-semibold text-sm sm:text-base">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span>Gemiddelde reactie: 3 seconden</span>
            </div>
          </div>

          {/* Feature 2 - Clean design */}
          <div className="group text-center hover:transform hover:scale-105 transition-all duration-300 cursor-pointer px-4 sm:px-0">
            <div className="relative mb-6 sm:mb-8 flex justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
              </div>
              <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 leading-tight group-hover:text-blue-300 transition-colors duration-300">
              Slimme Gespreksvoering
            </h3>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-sm mx-auto group-hover:text-slate-200 transition-colors duration-300 mb-4 sm:mb-6">
              Begrijpt context, stelt de juiste vragen, en begeleidt klanten 
              naar het perfecte afspraaktijdstip dat voor iedereen werkt.
            </p>
            <div className="flex items-center justify-center text-blue-400 font-semibold text-sm sm:text-base">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span>98% klanttevredenheid</span>
            </div>
          </div>

          {/* Feature 3 - Clean design */}
          <div className="group text-center hover:transform hover:scale-105 transition-all duration-300 cursor-pointer px-4 sm:px-0 md:col-span-2 lg:col-span-1">
            <div className="relative mb-6 sm:mb-8 flex justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Target className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
              </div>
              <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 leading-tight group-hover:text-purple-300 transition-colors duration-300">
              Perfect Voor Elk Bedrijf
            </h3>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-sm mx-auto group-hover:text-slate-200 transition-colors duration-300 mb-4 sm:mb-6">
              Salons, klinieken, fitnessstudio's, consultants - als je afspraken boekt, 
              past onze AI zich aan je specifieke bedrijfsbehoeften aan.
            </p>
            <div className="flex items-center justify-center text-purple-400 font-semibold text-sm sm:text-base">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span>300% meer boekingen gem.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solution;
