
import { Check, Calendar, Globe, BarChart3, Bell, Settings, Zap } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Zap,
      title: "100% Automatische Boekingen",
      description: "Geen handmatige tussenkomst nodig. Boekt, bevestigt en plant automatisch om",
      color: "from-yellow-400 to-orange-500"
    },
    {
      icon: Settings,
      title: "Volledig Gepersonaliseerd",
      description: "Pas de AI Agent aan je diensten, FAQ's en boekingslogica aan — van aangepaste kapseltypes tot bedrijfsspecifieke vragen",
      color: "from-purple-400 to-pink-500"
    },
    {
      icon: Calendar,
      title: "Agenda Synchronisatie",
      description: "Integreert met Google Calendar, Outlook, Calendly en meer",
      color: "from-blue-400 to-indigo-500"
    },
    {
      icon: Bell,
      title: "Automatische Herinneringen",
      description: "Stuurt bevestigings- en herinneringsberichten om no-shows te verminderen",
      color: "from-green-400 to-emerald-500"
    },
    {
      icon: BarChart3,
      title: "Gedetailleerde Analytics",
      description: "Volg boekingspercentages, populaire tijden en gegenereerde omzet",
      color: "from-cyan-400 to-blue-500"
    },
    {
      icon: Globe,
      title: "Meertalige Ondersteuning",
      description: "Communiceert automatisch in de voorkeurstaal van je klanten",
      color: "from-rose-400 to-red-500"
    }
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Alles Wat Je Nodig Hebt Om{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Boekingen Te Automatiseren
            </span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Krachtige functies die naadloos samenwerken om je boekingen en omzet te maximaliseren
          </p>
        </div>
        
        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-500 hover:-translate-y-2"
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-300 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
        
        {/* CTA Section */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-12 text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-500/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <h3 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              Laat Omzet Niet Slapen Terwijl Jij Dat Wel Doet
            </h3>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Terwijl jij bezig bent met klanten, is je AI agent bezig met het boeken van nieuwe. 
              Start je gratis proefperiode en zie het verschil dat automatisering maakt.
            </p>
            
            <div className="flex flex-wrap justify-center gap-12">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2 text-emerald-400">24/7</div>
                <div className="text-slate-400 text-sm uppercase tracking-wider">Altijd Werkend</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2 text-emerald-400">∞</div>
                <div className="text-slate-400 text-sm uppercase tracking-wider">Onbeperkte Capaciteit</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2 text-emerald-400">0%</div>
                <div className="text-slate-400 text-sm uppercase tracking-wider">Menselijke Fouten</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
