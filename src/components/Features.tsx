
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
    <section className="space-luxury-lg bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Enhanced background with luxury depth */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl animate-breathe"></div>
        <div className="absolute bottom-20 right-10 w-[32rem] h-[32rem] bg-emerald-500/6 rounded-full blur-3xl animate-breathe delay-luxury-2"></div>
      </div>
      
      {/* Premium grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.06)_1px,transparent_1px)] bg-[size:80px_80px] opacity-25"></div>
      
      <div className="container-luxury relative z-10">
        {/* Luxury header section */}
        <div className="text-center space-golden-lg">
          <h2 className="text-4xl md:text-6xl xl:text-7xl font-black text-white breathe-md text-balance reading-width-wide">
            Everything You Need To{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent relative">
              Automate Bookings
              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400/10 to-green-400/10 blur-2xl -z-10 animate-breathe"></div>
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-slate-300 reading-width font-light leading-relaxed text-pretty">
            <span className="md:hidden">Features that maximize bookings and revenue</span>
            <span className="hidden md:inline">Powerful features that work seamlessly together to maximize your bookings and revenue</span>
          </p>
        </div>
        
        {/* Desktop: Enhanced grid - Fixed layout */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-golden-lg space-golden-lg">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group relative animate-fade-in-luxury"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Luxury card background with gradient border */}
              <div className="absolute inset-0 glass-subtle rounded-3xl shadow-luxury-md group-hover:shadow-luxury-lg transition-luxury"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative text-center p-6 md:p-8 transition-luxury group-hover:-translate-y-1">
                <div className="relative mb-6 md:mb-8 flex justify-center">
                  <div className={`w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-luxury-md group-hover:shadow-luxury-lg transition-luxury group-hover:ring-2 group-hover:ring-emerald-500/20`}>
                    <feature.icon className="w-7 h-7 md:w-10 md:h-10 text-white group-hover:scale-105 transition-transform duration-300" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="text-lg md:text-xl xl:text-2xl font-bold text-white mb-3 md:mb-4 leading-tight group-hover:text-slate-100 transition-colors duration-300 text-balance">
                  {feature.title}
                </h3>
                <p className="text-slate-300 text-sm md:text-base xl:text-lg leading-relaxed group-hover:text-slate-200 transition-colors duration-300 text-pretty">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: Enhanced carousel */}
        <div className="md:hidden mb-12">
          <div 
            ref={featuresCarouselRef}
            className="overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain perfect-snap-carousel"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="flex pb-6">
              {features.map((feature, index) => (
                <div key={index} className="w-[calc(100vw-2rem)] flex-none snap-start snap-always mx-4">
                  <div className="glass-subtle rounded-3xl p-6 text-center h-full shadow-luxury-sm">
                    <div className="relative mb-4 flex justify-center">
                      <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-luxury-sm`}>
                        <feature.icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-white mb-3 leading-tight">
                      {feature.title}
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {feature.mobileDescription || feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Enhanced carousel indicators */}
          <div className="flex justify-center space-x-2 mt-6 mb-12">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => handleFeatureIndicatorClick(index)}
                className={`h-2 rounded-full transition-luxury ${
                  index === activeFeatureIndex
                    ? 'bg-emerald-400 w-6 shadow-luxury-sm'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
                }`}
                aria-label={`Go to feature ${index + 1}`}
              />
            ))}
          </div>
        </div>
        
        {/* Enhanced CTA Section with luxury styling */}
        <div className="text-center relative overflow-hidden space-golden-lg">
          {/* Background decoration for CTA */}
          <div className="absolute top-0 right-0 w-64 h-64 md:w-80 md:h-80 bg-emerald-500/8 rounded-full blur-3xl animate-breathe"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 md:w-64 md:h-64 bg-emerald-500/6 rounded-full blur-3xl animate-breathe delay-luxury-2"></div>
          
          <div className="relative z-10">
            <h3 className="text-3xl md:text-5xl xl:text-6xl font-black breathe-md text-white text-balance reading-width-wide">
              Don't Let Revenue Sleep While You Do
            </h3>
            <p className="text-lg md:text-2xl text-slate-300 breathe-lg reading-width font-light leading-relaxed text-pretty">
              <span className="md:hidden">AI books while you work. Start free trial today.</span>
              <span className="hidden md:inline">While you're busy with customers, your AI agent is busy booking new ones. 
              Start your free trial and see the difference automation makes.</span>
            </p>
            
            {/* Desktop: Enhanced stats section */}
            <div className="hidden md:flex md:flex-row flex-wrap justify-center gap-golden-lg">
              {stats.map((stat, index) => (
                <div key={index} className="group text-center hover-lift cursor-pointer">
                  <div className="glass-subtle rounded-2xl p-6 md:p-8 shadow-luxury-md group-hover:shadow-luxury-lg transition-luxury">
                    <div className="text-4xl md:text-6xl xl:text-7xl font-black mb-2 md:mb-4 bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent group-hover:from-emerald-300 group-hover:to-green-300 transition-all duration-300">
                      {stat.value}
                    </div>
                    <div className="text-slate-400 text-sm md:text-base xl:text-lg uppercase tracking-wider group-hover:text-slate-300 transition-colors font-medium">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile: Enhanced stats grid */}
            <div className="md:hidden">
              <div className="grid grid-cols-3 gap-golden">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center glass-subtle rounded-2xl p-4 shadow-luxury-sm">
                    <div className="text-2xl font-black mb-1 bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-wider font-medium">
                      {stat.label}
                    </div>
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
