
import { Check, Calendar, Globe, BarChart3, Bell, Settings, Zap, Monitor, Link } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Zap,
      title: "100% Automatische Boekingen",
      description: "Geen handmatige tussenkomst nodig. Boekt, bevestigt en plant automatisch om",
      color: "from-emerald-500 to-emerald-600"
    },
    {
      icon: Settings,
      title: "Volledig Gepersonaliseerd",
      description: "Pas de AI Agent aan je diensten, FAQ's en boekingslogica aan — van aangepaste kapseltypes tot bedrijfsspecifieke vragen",
      color: "from-slate-500 to-slate-600"
    },
    {
      icon: Calendar,
      title: "Geavanceerd Dashboard & Eigen Kalender",
      description: "Krijg je eigen professionele kalender met een zeer geavanceerd dashboard voor complete controle over je boekingen",
      color: "from-emerald-400 to-emerald-500"
    },
    {
      icon: Link,
      title: "Koppel Je Bestaande Kalender",
      description: "Integreer naadloos met Google Calendar, Outlook, Calendly en meer - behoud je huidige workflow",
      color: "from-slate-400 to-slate-500"
    },
    {
      icon: Bell,
      title: "Automatische Herinneringen",
      description: "Stuurt bevestigings- en herinneringsberichten om no-shows te verminderen",
      color: "from-emerald-600 to-green-600"
    },
    {
      icon: BarChart3,
      title: "Gedetailleerde Analytics",
      description: "Volg boekingspercentages, populaire tijden en gegenereerde omzet in je persoonlijke dashboard",
      color: "from-slate-600 to-gray-600"
    },
    {
      icon: Globe,
      title: "Meertalige Ondersteuning",
      description: "Communiceert automatisch in de voorkeurstaal van je klanten",
      color: "from-emerald-500 to-green-500"
    },
    {
      icon: Monitor,
      title: "Realtime Dashboard Monitoring",
      description: "Bekijk live boekingen, prestaties en klantinteracties in je geavanceerde controlepaneel",
      color: "from-slate-500 to-gray-500"
    }
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
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
        
        {/* Clean features grid - no blocky containers */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group text-center hover:transform hover:scale-105 transition-all duration-300 cursor-pointer"
            >
              {/* Clean, minimal icon */}
              <div className="relative mb-8 flex justify-center">
                <div className={`w-20 h-20 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                  <feature.icon className="w-10 h-10 text-white" strokeWidth={1.5} />
                </div>
                
                {/* Subtle glow effect */}
                <div className={`absolute inset-0 w-20 h-20 bg-gradient-to-br ${feature.color} rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300`}></div>
              </div>
              
              {/* Clean typography */}
              <h3 className="text-xl font-bold text-white mb-4 leading-tight group-hover:text-emerald-300 transition-colors duration-300">
                {feature.title}
              </h3>
              
              {/* Simple description */}
              <p className="text-slate-300 text-base leading-relaxed group-hover:text-slate-200 transition-colors duration-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
        
        {/* Clean CTA Section */}
        <div className="text-center relative overflow-hidden">
          {/* Background decoration for CTA */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <h3 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              Laat Omzet Niet Slapen Terwijl Jij Dat Wel Doet
            </h3>
            <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
              Terwijl jij bezig bent met klanten, is je AI agent bezig met het boeken van nieuwe. 
              Start je gratis proefperiode en zie het verschil dat automatisering maakt.
            </p>
            
            {/* Clean stats section */}
            <div className="flex flex-wrap justify-center gap-16">
              <div className="group text-center hover:transform hover:scale-105 transition-all duration-300">
                <div className="text-4xl font-bold mb-2 text-emerald-400 group-hover:text-emerald-300 transition-colors">24/7</div>
                <div className="text-slate-400 text-sm uppercase tracking-wider group-hover:text-slate-300 transition-colors">Altijd Werkend</div>
              </div>
              <div className="group text-center hover:transform hover:scale-105 transition-all duration-300">
                <div className="text-4xl font-bold mb-2 text-emerald-400 group-hover:text-emerald-300 transition-colors">∞</div>
                <div className="text-slate-400 text-sm uppercase tracking-wider group-hover:text-slate-300 transition-colors">Onbeperkte Capaciteit</div>
              </div>
              <div className="group text-center hover:transform hover:scale-105 transition-all duration-300">
                <div className="text-4xl font-bold mb-2 text-emerald-400 group-hover:text-emerald-300 transition-colors">0%</div>
                <div className="text-slate-400 text-sm uppercase tracking-wider group-hover:text-slate-300 transition-colors">Menselijke Fouten</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
