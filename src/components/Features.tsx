
import { Check, Calendar, Globe, BarChart3, Bell, Settings, Zap, Monitor, Link } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Zap,
      title: "100% Automatic Bookings",
      description: "No manual intervention needed. Books, confirms and reschedules automatically",
      color: "from-emerald-500 to-emerald-600",
      hoverTextColor: "group-hover:text-emerald-300"
    },
    {
      icon: Settings,
      title: "Fully Personalized",
      description: "Customize the AI Agent to your services, FAQs and booking logic — from custom hairstyles to business-specific questions",
      color: "from-blue-500 to-blue-600",
      hoverTextColor: "group-hover:text-blue-300"
    },
    {
      icon: Calendar,
      title: "Advanced Dashboard & Own Calendar",
      description: "Get your own professional calendar with a highly advanced dashboard for complete control over your bookings",
      color: "from-green-400 to-green-500",
      hoverTextColor: "group-hover:text-green-300"
    },
    {
      icon: Link,
      title: "Connect Your Existing Calendar",
      description: "Integrate seamlessly with Google Calendar, Outlook, Calendly and more - maintain your current workflow",
      color: "from-blue-400 to-blue-500",
      hoverTextColor: "group-hover:text-blue-300"
    },
    {
      icon: Bell,
      title: "Automatic Reminders",
      description: "Sends confirmation and reminder messages to reduce no-shows",
      color: "from-emerald-600 to-green-600",
      hoverTextColor: "group-hover:text-emerald-300"
    },
    {
      icon: BarChart3,
      title: "Detailed Analytics",
      description: "Track booking rates, popular times and generated revenue in your personal dashboard",
      color: "from-blue-600 to-indigo-600",
      hoverTextColor: "group-hover:text-blue-300"
    },
    {
      icon: Globe,
      title: "Multi-language Support",
      description: "Automatically communicates in your customers' preferred language",
      color: "from-green-500 to-emerald-500",
      hoverTextColor: "group-hover:text-green-300"
    },
    {
      icon: Monitor,
      title: "Real-time Dashboard Monitoring",
      description: "View live bookings, performance and customer interactions in your advanced control panel",
      color: "from-blue-500 to-indigo-500",
      hoverTextColor: "group-hover:text-blue-300"
    }
  ];

  const stats = [
    { value: "24/7", label: "Always Working" },
    { value: "∞", label: "Unlimited Capacity" },
    { value: "0%", label: "Human Errors" }
  ];

  return (
    <section className="py-8 md:py-24 px-3 md:px-4 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header - Compact mobile */}
        <div className="text-center mb-8 md:mb-20">
          <h2 className="text-xl md:text-5xl font-bold text-white mb-3 md:mb-6 px-3 sm:px-0">
            Everything You Need To{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Automate Bookings
            </span>
          </h2>
          <p className="text-xs md:text-xl text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
            Powerful features that work seamlessly together to maximize your bookings and revenue
          </p>
        </div>
        
        {/* Desktop: Features grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-12 mb-12 md:mb-32">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group text-center hover:transform hover:scale-105 transition-all duration-300 cursor-pointer px-4 md:px-0"
            >
              <div className="relative mb-4 md:mb-8 flex justify-center">
                <div className={`w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                  <feature.icon className="w-6 h-6 md:w-10 md:h-10 text-white" strokeWidth={1.5} />
                </div>
                <div className={`absolute inset-0 w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br ${feature.color} rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300`}></div>
              </div>
              <h3 className={`text-base md:text-xl font-bold text-white mb-2 md:mb-4 leading-tight ${feature.hoverTextColor} transition-colors duration-300`}>
                {feature.title}
              </h3>
              <p className="text-slate-300 text-xs md:text-base leading-relaxed group-hover:text-slate-200 transition-colors duration-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile: Features carousel with snap-scroll */}
        <div className="md:hidden mb-8">
          <div className="overflow-x-auto snap-x snap-mandatory scroll-smooth">
            <div className="flex space-x-3">
              {features.map((feature, index) => (
                <div key={index} className="w-[75vw] flex-none snap-start snap-always bg-slate-800/50 rounded-2xl p-4 text-center">
                  <div className="relative mb-3 flex justify-center">
                    <div className={`w-8 h-8 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-lg`}>
                      <feature.icon className="w-4 h-4 text-white" strokeWidth={1.5} />
                    </div>
                  </div>
                  <h3 className="text-xs font-bold text-white mb-2 leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* Features carousel indicators */}
          <div className="flex justify-center space-x-1 mt-4">
            {Array.from({ length: Math.ceil(features.length / 2) }).map((_, index) => (
              <div key={index} className="w-1.5 h-1.5 bg-slate-600 rounded-full"></div>
            ))}
          </div>
        </div>
        
        {/* CTA Section - Compact mobile */}
        <div className="text-center relative overflow-hidden pt-8 md:pt-16 pb-8 md:pb-20">
          {/* Background decoration for CTA */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 px-3 sm:px-0">
            <h3 className="text-lg md:text-4xl font-bold mb-4 md:mb-8 text-white">
              Don't Let Revenue Sleep While You Do
            </h3>
            <p className="text-xs md:text-xl text-slate-300 mb-8 md:mb-16 max-w-2xl mx-auto">
              While you're busy with customers, your AI agent is busy booking new ones. 
              Start your free trial and see the difference automation makes.
            </p>
            
            {/* Desktop: Stats section */}
            <div className="hidden md:flex md:flex-row flex-wrap justify-center gap-6 md:gap-16">
              {stats.map((stat, index) => (
                <div key={index} className="group text-center hover:transform hover:scale-105 transition-all duration-300">
                  <div className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 text-emerald-400 group-hover:text-emerald-300 transition-colors">{stat.value}</div>
                  <div className="text-slate-400 text-xs md:text-sm uppercase tracking-wider group-hover:text-slate-300 transition-colors">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Mobile: Stats carousel with snap-scroll */}
            <div className="md:hidden">
              <div className="overflow-x-auto snap-x snap-mandatory scroll-smooth">
                <div className="flex space-x-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="w-[45vw] flex-none snap-start snap-always text-center bg-slate-800/30 rounded-xl p-4">
                      <div className="text-xl font-bold mb-1 text-emerald-400">{stat.value}</div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
