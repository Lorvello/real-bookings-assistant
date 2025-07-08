
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
    <section className="py-12 md:py-24 px-3 md:px-4 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header - Mobile optimized */}
        <div className="text-center mb-8 md:mb-20">
          <h2 className="text-xl md:text-5xl font-bold text-slate-800 mb-4 md:mb-6 px-3 sm:px-0">
            Everything You Need To{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent">
              Automate Bookings
            </span>
          </h2>
          <p className="text-sm md:text-xl text-slate-600 max-w-3xl mx-auto px-3 sm:px-0">
            <span className="md:hidden">Features that maximize bookings and revenue</span>
            <span className="hidden md:inline">Powerful features that work seamlessly together to maximize your bookings and revenue</span>
          </p>
        </div>
        
        {/* Desktop: Features grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-12 mb-12 md:mb-32">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group text-center transition-all duration-300 cursor-pointer px-4 md:px-0 hover:bg-white/10 rounded-2xl py-6 hover:shadow-lg hover:-translate-y-1 border border-transparent hover:border-gray-400/30"
            >
              <div className="relative mb-4 md:mb-8 flex justify-center">
                <div className={`w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:ring-2 group-hover:ring-gray-400/30`}>
                  <feature.icon className="w-6 h-6 md:w-10 md:h-10 text-white group-hover:scale-105 transition-transform duration-300" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className={`text-base md:text-xl font-bold text-slate-800 mb-2 md:mb-4 leading-tight group-hover:text-slate-700 transition-colors duration-300`}>
                {feature.title}
              </h3>
              <p className="text-slate-600 text-xs md:text-base leading-relaxed group-hover:text-slate-500 transition-colors duration-300">
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
                   <div className="bg-slate-100 rounded-2xl p-5 text-center h-full">
                     <div className="relative mb-4 flex justify-center">
                       <div className={`w-10 h-10 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-lg`}>
                         <feature.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                       </div>
                     </div>
                     <h3 className="text-sm font-bold text-slate-800 mb-3 leading-tight">
                       {feature.title}
                     </h3>
                     <p className="text-slate-600 text-xs leading-relaxed">
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
        <div className="text-center relative overflow-hidden pt-8 md:pt-16 pb-8 md:pb-20">
          {/* Background decoration for CTA */}
          <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 md:w-48 md:h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 px-3 sm:px-0">
            <h3 className="text-xl md:text-4xl font-bold mb-4 md:mb-8 text-slate-800">
              Don't Let Revenue Sleep While You Do
            </h3>
            <p className="text-sm md:text-xl text-slate-600 mb-8 md:mb-16 max-w-2xl mx-auto">
              <span className="md:hidden">AI books while you work. Start free trial today.</span>
              <span className="hidden md:inline">While you're busy with customers, your AI agent is busy booking new ones. 
              Start your free trial and see the difference automation makes.</span>
            </p>
            
            {/* Desktop: Stats section */}
            <div className="hidden md:flex md:flex-row flex-wrap justify-center gap-6 md:gap-16">
              {stats.map((stat, index) => (
                 <div key={index} className="group text-center hover:transform hover:scale-105 transition-all duration-300">
                   <div className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 text-emerald-500 group-hover:text-emerald-400 transition-colors">{stat.value}</div>
                   <div className="text-slate-500 text-xs md:text-sm uppercase tracking-wider group-hover:text-slate-400 transition-colors">{stat.label}</div>
                 </div>
              ))}
            </div>

            {/* Mobile: Stats grid (replaced carousel) */}
            <div className="md:hidden">
              <div className="grid grid-cols-3 gap-4">
                {stats.map((stat, index) => (
                   <div key={index} className="text-center bg-white/80 rounded-xl p-4">
                     <div className="text-xl font-bold mb-1 text-emerald-500">{stat.value}</div>
                     <div className="text-slate-500 text-xs uppercase tracking-wider">{stat.label}</div>
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
