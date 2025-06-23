
import { Phone, Calendar, Clock } from "lucide-react";

const PainPoint = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-6 py-3 mb-8 backdrop-blur-sm">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span className="text-red-300 text-sm font-medium">Het Probleem</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            <span className="text-red-400">80%</span> van Klanten Vallen Af
            <br />
            Door <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">Slechte Bereikbaarheid</span>
          </h2>
          
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Wanneer klanten je niet direct kunnen bereiken, gaan ze naar je concurrenten. 
            Elke gemiste kans is omzet die wegloopt.
          </p>
        </div>
        
        {/* Pain points grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Phone className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              Gemiste Oproepen = Verloren Omzet
            </h3>
            <p className="text-slate-300 leading-relaxed">
              Elke onbeantwoorde oproep is geld dat wegloopt. Je concurrenten zijn slechts één klik verwijderd.
            </p>
          </div>
          
          <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              Dubbele Boekingen Breken Vertrouwen
            </h3>
            <p className="text-slate-300 leading-relaxed">
              Handmatige planning leidt tot gênante conflicten die je reputatie beschadigen en klanten voor altijd verliezen.
            </p>
          </div>
          
          <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              Na Kantooruren = Nul Boekingen
            </h3>
            <p className="text-slate-300 leading-relaxed">
              Terwijl jij slaapt, vangen je concurrenten leads op. Nachtelijke vragen worden ochtend teleurstellingen.
            </p>
          </div>
        </div>
        
        {/* Testimonial */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600/50 rounded-2xl p-8 text-center backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <p className="text-lg md:text-xl font-medium mb-6 max-w-3xl mx-auto leading-relaxed text-slate-200">
              "Ik verloor 3-4 boekingen per week alleen omdat ik mijn telefoon niet kon opnemen tijdens sessies. 
              Het kostte me duizenden aan omzet."
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                <span className="text-emerald-400 font-bold text-lg">S</span>
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">Sarah</div>
                <div className="text-slate-400 text-sm">Wellness Coach</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PainPoint;
