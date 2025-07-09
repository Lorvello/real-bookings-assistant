
import { 
  LightningBoltIcon as BoltIcon,
  GearIcon,
  CalendarIcon,
  Link2Icon,
  BellIcon,
  BarChartIcon as BarChart3Icon,
  GlobeIcon,
  DesktopIcon as MonitorIcon
} from "@radix-ui/react-icons";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";

const Features = () => {
  const bookingFeatures = [
    {
      Icon: BoltIcon,
      name: "100% Automatic Bookings",
      description: "No manual intervention needed. Books, confirms and reschedules automatically",
      href: "/features/automation",
      cta: "Learn more",
      background: <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-600/20" />,
      className: "lg:row-start-1 lg:row-end-3 lg:col-start-1 lg:col-end-2",
    },
    {
      Icon: GearIcon,
      name: "Fully Personalized",
      description: "Customize the AI Agent to your services, FAQs and booking logic",
      href: "/features/personalization",
      cta: "Learn more",
      background: <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-600/20" />,
      className: "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2",
    },
    {
      Icon: CalendarIcon,
      name: "Advanced Dashboard & Own Calendar",
      description: "Get your own professional calendar with advanced dashboard for complete control",
      href: "/features/dashboard",
      cta: "Learn more",
      background: <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-600/20" />,
      className: "lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-3",
    },
    {
      Icon: Link2Icon,
      name: "Connect Your Existing Calendar",
      description: "Integrate seamlessly with Google Calendar, Outlook, Calendly and more",
      href: "/features/integration",
      cta: "Learn more",
      background: <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-600/20" />,
      className: "lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-4",
    },
    {
      Icon: BellIcon,
      name: "Automatic Reminders",
      description: "Sends confirmation and reminder messages to reduce no-shows",
      href: "/features/reminders",
      cta: "Learn more",
      background: <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-600/20" />,
      className: "lg:row-start-3 lg:row-end-4 lg:col-start-1 lg:col-end-2",
    },
    {
      Icon: BarChart3Icon,
      name: "Detailed Analytics",
      description: "Track booking rates, popular times and generated revenue",
      href: "/features/analytics",
      cta: "Learn more",
      background: <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-600/20" />,
      className: "lg:col-start-3 lg:col-end-4 lg:row-start-3 lg:row-end-4",
    },
    {
      Icon: GlobeIcon,
      name: "Multi-language Support",
      description: "Automatically communicates in your customers' preferred language",
      href: "/features/multilingual",
      cta: "Learn more",
      background: <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-600/20" />,
      className: "lg:col-start-1 lg:col-end-3 lg:row-start-4 lg:row-end-5",
    },
    {
      Icon: MonitorIcon,
      name: "Real-time Dashboard Monitoring",
      description: "View live bookings, performance and customer interactions",
      href: "/features/monitoring",
      cta: "Learn more",
      background: <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-600/20" />,
      className: "lg:col-start-3 lg:col-end-4 lg:row-start-4 lg:row-end-5",
    },
  ];

  const stats = [
    { value: "24/7", label: "Always Working" },
    { value: "∞", label: "Unlimited Capacity" },
    { value: "0%", label: "Human Errors" }
  ];

  return (
    <section className="py-12 md:py-24 px-3 md:px-4 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Background decoration - Optimized for mobile */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header - Mobile optimized */}
        <div className="text-center mb-8 md:mb-20">
          <h2 className="text-xl md:text-5xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
            Everything You Need To{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Automate Bookings
            </span>
          </h2>
          <p className="text-sm md:text-xl text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
            <span className="md:hidden">Features that maximize bookings and revenue</span>
            <span className="hidden md:inline">Powerful features that work seamlessly together to maximize your bookings and revenue</span>
          </p>
        </div>
        
        {/* Bento Grid Features */}
        <div className="mb-12 md:mb-32">
          <BentoGrid>
            {bookingFeatures.map((feature, idx) => (
              <BentoCard key={idx} {...feature} />
            ))}
          </BentoGrid>
        </div>
        
        {/* CTA Section - Mobile optimized */}
        <div className="text-center relative overflow-hidden pt-8 md:pt-16 pb-8 md:pb-20">
          {/* Background decoration for CTA */}
          <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 md:w-48 md:h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 px-3 sm:px-0">
            <h3 className="text-xl md:text-4xl font-bold mb-4 md:mb-8 text-white">
              Don't Let Revenue Sleep While You Do
            </h3>
            <p className="text-sm md:text-xl text-slate-300 mb-8 md:mb-16 max-w-2xl mx-auto">
              <span className="md:hidden">AI books while you work. Start free trial today.</span>
              <span className="hidden md:inline">While you're busy with customers, your AI agent is busy booking new ones. 
              Start your free trial and see the difference automation makes.</span>
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

            {/* Mobile: Stats grid (replaced carousel) */}
            <div className="md:hidden">
              <div className="grid grid-cols-3 gap-4">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center bg-slate-800/30 rounded-xl p-4">
                    <div className="text-xl font-bold mb-1 text-emerald-400">{stat.value}</div>
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
