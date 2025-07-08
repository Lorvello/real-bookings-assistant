
import { Check, Calendar, Globe, BarChart3, Bell, Settings, Zap, Monitor, Link } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const Features = () => {
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [activeStatsIndex, setActiveStatsIndex] = useState(0);
  const featuresCarouselRef = useRef<HTMLDivElement>(null);
  const statsCarouselRef = useRef<HTMLDivElement>(null);

  const features = [
    {
      icon: Zap,
      title: "100% Automatic Bookings",
      description: "No manual intervention needed. Books, confirms and reschedules automatically",
      mobileDescription: "Fully automatic booking system",
      color: "from-emerald-500 to-emerald-600",
      hoverTextColor: "group-hover:text-emerald-300"
    },
    {
      icon: Settings,
      title: "Fully Personalized",
      description: "Customize the AI Agent to your services, FAQs and booking logic, from custom hairstyles to business-specific questions",
      mobileDescription: "Customize AI to your business needs",
      color: "from-blue-500 to-blue-600",
      hoverTextColor: "group-hover:text-blue-300"
    },
    {
      icon: Calendar,
      title: "Advanced Dashboard & Own Calendar",
      description: "Get your own professional calendar with a highly advanced dashboard for complete control over your bookings",
      mobileDescription: "Professional calendar with advanced dashboard",
      color: "from-green-400 to-green-500",
      hoverTextColor: "group-hover:text-green-300"
    },
    {
      icon: Link,
      title: "Connect Your Existing Calendar",
      description: "Integrate seamlessly with Google Calendar, Outlook, Calendly and more, maintain your current workflow",
      mobileDescription: "Connects to Google, Outlook, Calendly",
      color: "from-blue-400 to-blue-500",
      hoverTextColor: "group-hover:text-blue-300"
    },
    {
      icon: Bell,
      title: "Automatic Reminders",
      description: "Sends confirmation and reminder messages to reduce no-shows",
      mobileDescription: "Auto confirmations and reminders",
      color: "from-emerald-600 to-green-600",
      hoverTextColor: "group-hover:text-emerald-300"
    },
    {
      icon: BarChart3,
      title: "Detailed Analytics",
      description: "Track booking rates, popular times and generated revenue in your personal dashboard",
      mobileDescription: "Track rates, times, revenue",
      color: "from-blue-600 to-indigo-600",
      hoverTextColor: "group-hover:text-blue-300"
    },
    {
      icon: Globe,
      title: "Multi-language Support",
      description: "Automatically communicates in your customers' preferred language",
      mobileDescription: "Speaks your customers' language",
      color: "from-green-500 to-emerald-500",
      hoverTextColor: "group-hover:text-green-300"
    },
    {
      icon: Monitor,
      title: "Real-time Dashboard Monitoring",
      description: "View live bookings, performance and customer interactions in your advanced control panel",
      mobileDescription: "Live monitoring and insights",
      color: "from-blue-500 to-indigo-500",
      hoverTextColor: "group-hover:text-blue-300"
    }
  ];

  const stats = [
    { value: "24/7", label: "Always Working" },
    { value: "∞", label: "Unlimited Capacity" },
    { value: "0%", label: "Human Errors" }
  ];

  // Handle features carousel scroll
  useEffect(() => {
    const carousel = featuresCarouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const itemWidth = carousel.children[0]?.clientWidth || 0;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setActiveFeatureIndex(newIndex);
    };

    carousel.addEventListener('scroll', handleScroll, { passive: true });
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle stats carousel scroll
  useEffect(() => {
    const carousel = statsCarouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const itemWidth = carousel.children[0]?.clientWidth || 0;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setActiveStatsIndex(newIndex);
    };

    carousel.addEventListener('scroll', handleScroll, { passive: true });
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle carousel indicator clicks
  const handleFeatureIndicatorClick = (index: number) => {
    const carousel = featuresCarouselRef.current;
    if (!carousel) return;
    
    const itemWidth = carousel.children[0]?.clientWidth || 0;
    carousel.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth'
    });
  };

  const handleStatsIndicatorClick = (index: number) => {
    const carousel = statsCarouselRef.current;
    if (!carousel) return;
    
    const itemWidth = carousel.children[0]?.clientWidth || 0;
    carousel.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth'
    });
  };

  return (
    <section className="py-6 md:py-12 px-3 md:px-4 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Background decoration - Optimized for mobile */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header - Mobile optimized */}
        <div className="text-center mb-4 md:mb-8">
          <h2 className="text-lg md:text-2xl font-bold text-white mb-2 md:mb-3 px-3 sm:px-0">
            Everything You Need To{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Automate Bookings
            </span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
            <span className="md:hidden">Features that maximize bookings and revenue</span>
            <span className="hidden md:inline">Powerful features that work seamlessly together to maximize your bookings and revenue</span>
          </p>
        </div>
        
        {/* Desktop: Features grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-12">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group text-center transition-all duration-300 cursor-pointer px-4 md:px-0 hover:bg-slate-800/20 rounded-2xl py-6 hover:shadow-lg hover:-translate-y-1 border border-transparent hover:border-slate-700/50"
            >
              <div className="relative mb-3 md:mb-4 flex justify-center">
                <div className={`w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:ring-2 group-hover:ring-slate-600/30`}>
                  <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:scale-105 transition-transform duration-300" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className={`text-sm md:text-base font-bold text-white mb-2 md:mb-3 leading-tight group-hover:text-slate-100 transition-colors duration-300`}>
                {feature.title}
              </h3>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed group-hover:text-slate-200 transition-colors duration-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile: Perfect snapping features carousel */}
        <div className="md:hidden mb-8">
          <div 
            ref={featuresCarouselRef}
            className="overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain perfect-snap-carousel"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="flex pb-4">
              {features.map((feature, index) => (
                <div key={index} className="w-[calc(100vw-2rem)] flex-none snap-start snap-always mx-4">
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center h-full">
                    <div className="relative mb-3 flex justify-center">
                      <div className={`w-8 h-8 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-lg`}>
                        <feature.icon className="w-4 h-4 text-white" strokeWidth={1.5} />
                      </div>
                    </div>
                    <h3 className="text-xs font-bold text-white mb-2 leading-tight">
                      {feature.title}
                    </h3>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      {feature.mobileDescription || feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Enhanced features carousel indicators - All 8 indicators */}
          <div className="flex justify-center space-x-1 mt-4 mb-8">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => handleFeatureIndicatorClick(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === activeFeatureIndex
                    ? 'bg-emerald-400 w-4'
                    : 'bg-slate-600 hover:bg-slate-500'
                }`}
                aria-label={`Go to feature ${index + 1}`}
              />
            ))}
          </div>
        </div>
        
        {/* CTA Section - Mobile optimized */}
        <div className="text-center relative overflow-hidden pt-4 md:pt-8 pb-4 md:pb-8">
          {/* Background decoration for CTA */}
          <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 md:w-48 md:h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 px-3 sm:px-0">
            <h3 className="text-lg md:text-2xl font-bold mb-3 md:mb-4 text-white">
              Don't Let Revenue Sleep While You Do
            </h3>
            <p className="text-xs md:text-sm text-slate-300 mb-4 md:mb-8 max-w-2xl mx-auto">
              <span className="md:hidden">AI books while you work. Start free trial today.</span>
              <span className="hidden md:inline">While you're busy with customers, your AI agent is busy booking new ones. 
              Start your free trial and see the difference automation makes.</span>
            </p>
            
            {/* Desktop: Stats section */}
            <div className="hidden md:flex md:flex-row flex-wrap justify-center gap-4 md:gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="group text-center hover:transform hover:scale-105 transition-all duration-300">
                  <div className="text-xl md:text-2xl font-bold mb-1 md:mb-2 text-emerald-400 group-hover:text-emerald-300 transition-colors">{stat.value}</div>
                  <div className="text-slate-400 text-xs md:text-sm uppercase tracking-wider group-hover:text-slate-300 transition-colors">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Mobile: Stats grid (replaced carousel) */}
            <div className="md:hidden">
              <div className="grid grid-cols-3 gap-3">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center bg-slate-800/30 rounded-xl p-3">
                    <div className="text-lg font-bold mb-1 text-emerald-400">{stat.value}</div>
                    <div className="text-slate-400 text-xs uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
