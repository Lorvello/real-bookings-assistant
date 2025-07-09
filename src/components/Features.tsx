
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
      background: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          
          {/* iPhone Mockup - positioned in upper 70%, centered */}
          <div className="absolute top-0 left-0 right-0 h-[75%] flex justify-center items-center">
            <div className="w-72 h-[90%] transform rotate-2 hover:rotate-0 transition-transform duration-500 ease-in-out">
              {/* iPhone outer frame with realistic proportions */}
              <div className="relative bg-gradient-to-b from-gray-900 via-gray-700 to-gray-900 rounded-[3rem] p-[2px] shadow-2xl h-full border border-gray-600">
                {/* iPhone screen bezel */}
                <div className="relative bg-black rounded-[2.8rem] p-[2px] h-full">
                  {/* iPhone screen */}
                  <div className="bg-white rounded-[2.6rem] relative h-full flex flex-col overflow-hidden shadow-inner">
                    {/* iPhone notch - more realistic */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-4 bg-black rounded-b-xl z-10"></div>
                    
                    {/* WhatsApp header with better styling */}
                    <div className="bg-[#25D366] text-white px-3 py-2 flex items-center gap-2 pt-5 shadow-sm">
                      {/* Profile picture with gradient */}
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-xs">🤖</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[10px] leading-tight">Hair Studio AI</h3>
                        <p className="text-[7px] text-white/80 leading-tight">online</p>
                      </div>
                      {/* WhatsApp header icons */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs opacity-80">📹</span>
                        <span className="text-xs opacity-80">📞</span>
                        <span className="text-xs opacity-80">⋮</span>
                      </div>
                    </div>
                
                    {/* Chat area with WhatsApp background pattern */}
                    <div className="bg-[#e5ddd5] flex-1 flex flex-col justify-between p-3 py-4 relative">
                      {/* Subtle WhatsApp background pattern */}
                      <div className="absolute inset-0 opacity-5 bg-repeat" style={{backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"2\" fill=\"%23000\"/></svg>')", backgroundSize: "20px 20px"}}></div>
                      
                      <div className="space-y-3 relative z-10">
                        {/* Customer message */}
                        <div className="flex justify-end">
                          <div className="bg-[#dcf8c6] rounded-2xl rounded-br-md px-3 py-2 max-w-[75%] shadow-md relative">
                            <p className="text-gray-800 text-[10px] leading-relaxed">Hello, I'd like to book an appointment for tomorrow</p>
                            <div className="text-[6px] text-gray-500 text-right mt-1">12:30 PM ✓✓</div>
                          </div>
                        </div>
                        
                        {/* AI response 1 */}
                        <div className="flex justify-start">
                          <div className="bg-white rounded-2xl rounded-bl-md px-3 py-2 max-w-[75%] shadow-md relative">
                            <p className="text-gray-800 text-[10px] leading-relaxed">Of course! Which service would you like? I have these options:</p>
                            <div className="text-[6px] text-gray-500 mt-1">12:31 PM</div>
                          </div>
                        </div>
                        
                        {/* AI response 2 - services */}
                        <div className="flex justify-start">
                          <div className="bg-white rounded-2xl rounded-bl-md px-3 py-2 max-w-[75%] shadow-md">
                            <p className="text-gray-800 text-[10px] leading-relaxed">💇‍♀️ Haircut - $25 (45 min)<br/>💇‍♀️ Coloring - $65 (90 min)<br/>💇‍♀️ Wash - $15 (20 min)</p>
                            <div className="text-[6px] text-gray-500 mt-1">12:31 PM</div>
                          </div>
                        </div>
                        
                        {/* Customer choice */}
                        <div className="flex justify-end">
                          <div className="bg-[#dcf8c6] rounded-2xl rounded-br-md px-3 py-2 max-w-[75%] shadow-md">
                            <p className="text-gray-800 text-[10px] leading-relaxed">Haircut please</p>
                            <div className="text-[6px] text-gray-500 text-right mt-1">12:32 PM ✓✓</div>
                          </div>
                        </div>
                        
                        {/* AI response 3 - time slots */}
                        <div className="flex justify-start">
                          <div className="bg-white rounded-2xl rounded-bl-md px-3 py-2 max-w-[75%] shadow-md">
                            <p className="text-gray-800 text-[10px] leading-relaxed">Perfect! When works for you? Tomorrow I have available:<br/>🕐 10:00 AM<br/>🕐 2:00 PM<br/>🕐 4:30 PM</p>
                            <div className="text-[6px] text-gray-500 mt-1">12:32 PM</div>
                          </div>
                        </div>
                        
                        {/* Customer time choice */}
                        <div className="flex justify-end">
                          <div className="bg-[#dcf8c6] rounded-2xl rounded-br-md px-3 py-2 max-w-[75%] shadow-md">
                            <p className="text-gray-800 text-[10px] leading-relaxed">2:00 PM works</p>
                            <div className="text-[6px] text-gray-500 text-right mt-1">12:33 PM ✓✓</div>
                          </div>
                        </div>
                        
                        {/* Final confirmation */}
                        <div className="flex justify-start">
                          <div className="bg-white rounded-2xl rounded-bl-md px-3 py-2 max-w-[75%] shadow-md">
                            <p className="text-gray-800 text-[10px] leading-relaxed">Perfect! Your appointment is confirmed for tomorrow at 2:00 PM ✅</p>
                            <div className="text-[6px] text-gray-500 mt-1">12:33 PM</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Modern WhatsApp Input Bar */}
                    <div className="bg-[#f0f0f0] border-t border-gray-200 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button className="text-gray-500 hover:text-gray-700 p-1">
                          <span className="text-lg">😊</span>
                        </button>
                        <button className="text-gray-500 hover:text-gray-700 p-1">
                          <span className="text-lg">📎</span>
                        </button>
                        <div className="flex-1 bg-white rounded-full px-3 py-2 border border-gray-200 shadow-sm">
                          <div className="text-[10px] text-gray-400">Type a message</div>
                        </div>
                        <button className="text-gray-500 hover:text-gray-700 p-1">
                          <span className="text-lg">🎤</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Background accent elements */}
          <div className="absolute bottom-6 left-6 text-emerald-400/30 text-4xl font-bold">24/7</div>
          <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-500/20 rounded-full blur-lg" />
        </div>
      ),
      className: "lg:row-start-1 lg:row-end-3 lg:col-start-1 lg:col-end-2",
      hideCta: true,
    },
    {
      Icon: GearIcon,
      name: "Fully Personalized",
      description: "Customize the AI Agent to your services, FAQs and booking logic",
      href: "/features/personalization",
      cta: "Learn more",
      background: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-blue-700/20" />
          <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500/30 rounded-full" />
          <div className="absolute bottom-3 right-3 w-4 h-4 bg-blue-400/40 rounded-full" />
        </div>
      ),
      className: "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2",
    },
    {
      Icon: CalendarIcon,
      name: "Advanced Dashboard & Own Calendar",
      description: "Get your own professional calendar with advanced dashboard for complete control",
      href: "/features/dashboard",
      cta: "Learn more",
      background: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          <div className="absolute top-4 left-4 w-12 h-2 bg-emerald-500/30 rounded-full" />
          <div className="absolute top-8 left-6 w-8 h-2 bg-emerald-400/40 rounded-full" />
          <div className="absolute top-12 left-4 w-16 h-2 bg-emerald-300/20 rounded-full" />
        </div>
      ),
      className: "lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-3",
    },
    {
      Icon: Link2Icon,
      name: "Connect Your Existing Calendar",
      description: "Integrate seamlessly with Google Calendar, Outlook, Calendly and more",
      href: "/features/integration",
      cta: "Learn more",
      background: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-blue-700/20" />
          <div className="absolute top-3 left-3 w-3 h-3 border border-blue-400/40 rounded-full" />
          <div className="absolute top-6 left-8 w-2 h-2 bg-blue-500/50 rounded-full" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border border-blue-300/30 rounded" />
        </div>
      ),
      className: "lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-4",
    },
    {
      Icon: BellIcon,
      name: "Automatic Reminders",
      description: "Sends confirmation and reminder messages to reduce no-shows",
      href: "/features/reminders",
      cta: "Learn more",
      background: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          <div className="absolute top-4 right-4 w-6 h-1 bg-emerald-500/40 rounded-full animate-pulse" />
          <div className="absolute bottom-6 left-4 text-emerald-400/20 text-4xl">📧</div>
        </div>
      ),
      className: "lg:row-start-3 lg:row-end-4 lg:col-start-1 lg:col-end-2",
    },
    {
      Icon: BarChart3Icon,
      name: "Detailed Analytics",
      description: "Track booking rates, popular times and generated revenue",
      href: "/features/analytics",
      cta: "Learn more",
      background: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-blue-700/20" />
          <div className="absolute top-4 left-4 w-8 h-1 bg-blue-500/40 rounded" />
          <div className="absolute top-7 left-6 w-6 h-1 bg-blue-400/50 rounded" />
          <div className="absolute top-10 left-4 w-10 h-1 bg-blue-300/30 rounded" />
        </div>
      ),
      className: "lg:col-start-3 lg:col-end-4 lg:row-start-3 lg:row-end-4",
    },
    {
      Icon: GlobeIcon,
      name: "Multi-language Support",
      description: "Automatically communicates in your customers' preferred language",
      href: "/features/multilingual",
      cta: "Learn more",
      background: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          <div className="absolute top-4 left-4 text-emerald-400/30 text-2xl">🌍</div>
          <div className="absolute bottom-4 right-4 w-3 h-3 bg-emerald-500/40 rounded-full" />
        </div>
      ),
      className: "lg:col-start-1 lg:col-end-3 lg:row-start-4 lg:row-end-5",
    },
    {
      Icon: MonitorIcon,
      name: "Real-time Dashboard Monitoring",
      description: "View live bookings, performance and customer interactions",
      href: "/features/monitoring",
      cta: "Learn more",
      background: (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-blue-700/20" />
          <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500/60 rounded-full animate-pulse" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border border-blue-400/30 rounded" />
        </div>
      ),
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
