
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

  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header - Mobile optimized */}
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 px-4 sm:px-0">
            Everything You Need To{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Automate Bookings
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto px-4 sm:px-0">
            Powerful features that work seamlessly together to maximize your bookings and revenue
          </p>
        </div>
        
        {/* Features grid - Mobile first responsive design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 md:gap-12 mb-20 sm:mb-24 md:mb-32">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group text-center hover:transform hover:scale-105 transition-all duration-300 cursor-pointer px-4 sm:px-0"
            >
              {/* Clean, minimal icon */}
              <div className="relative mb-6 sm:mb-8 flex justify-center">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                  <feature.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
                </div>
                
                {/* Subtle glow effect */}
                <div className={`absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${feature.color} rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300`}></div>
              </div>
              
              {/* Clean typography */}
              <h3 className={`text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 leading-tight ${feature.hoverTextColor} transition-colors duration-300`}>
                {feature.title}
              </h3>
              
              {/* Simple description */}
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed group-hover:text-slate-200 transition-colors duration-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
        
        {/* CTA Section - Mobile optimized */}
        <div className="text-center relative overflow-hidden pt-12 sm:pt-16 pb-16 sm:pb-20">
          {/* Background decoration for CTA */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 px-4 sm:px-0">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-white">
              Don't Let Revenue Sleep While You Do
            </h3>
            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-12 sm:mb-16 max-w-2xl mx-auto">
              While you're busy with customers, your AI agent is busy booking new ones. 
              Start your free trial and see the difference automation makes.
            </p>
            
            {/* Stats section - Mobile optimized */}
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-8 sm:gap-12 md:gap-16">
              <div className="group text-center hover:transform hover:scale-105 transition-all duration-300">
                <div className="text-3xl sm:text-4xl font-bold mb-2 text-emerald-400 group-hover:text-emerald-300 transition-colors">24/7</div>
                <div className="text-slate-400 text-xs sm:text-sm uppercase tracking-wider group-hover:text-slate-300 transition-colors">Always Working</div>
              </div>
              <div className="group text-center hover:transform hover:scale-105 transition-all duration-300">
                <div className="text-3xl sm:text-4xl font-bold mb-2 text-emerald-400 group-hover:text-emerald-300 transition-colors">∞</div>
                <div className="text-slate-400 text-xs sm:text-sm uppercase tracking-wider group-hover:text-slate-300 transition-colors">Unlimited Capacity</div>
              </div>
              <div className="group text-center hover:transform hover:scale-105 transition-all duration-300">
                <div className="text-3xl sm:text-4xl font-bold mb-2 text-emerald-400 group-hover:text-emerald-300 transition-colors">0%</div>
                <div className="text-slate-400 text-xs sm:text-sm uppercase tracking-wider group-hover:text-slate-300 transition-colors">Human Errors</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
