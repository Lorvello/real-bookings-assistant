import { LightningBoltIcon as BoltIcon, GearIcon, CalendarIcon, Link2Icon, BellIcon, BarChartIcon as BarChart3Icon, GlobeIcon, DesktopIcon as MonitorIcon } from "@radix-ui/react-icons";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
const Features = () => {
  const bookingFeatures = [{
    Icon: BoltIcon,
    name: "100% Automatic Bookings",
    description: "No manual intervention needed. Books, confirms and reschedules automatically",
    href: "/features/automation",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          
          {/* iPhone Mockup - positioned in upper 70%, centered */}
          <div className="absolute top-0 left-0 right-0 h-[75%] flex justify-center items-center">
            <div className="w-60 h-[85%] transform rotate-3 hover:rotate-0 transition-transform duration-500 ease-in-out">
              {/* iPhone outer frame */}
              <div className="relative bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-[2.5rem] p-[3px] shadow-2xl h-full border border-gray-700">
                {/* iPhone screen bezel */}
                <div className="relative bg-black rounded-[2.2rem] p-[4px] h-full">
                  {/* iPhone screen */}
                  <div className="bg-white rounded-[1.8rem] relative h-full flex flex-col overflow-hidden shadow-inner">
                {/* iPhone notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-3 bg-black rounded-b-lg z-10"></div>
                
                {/* WhatsApp header */}
                <div className="bg-[#25D366] text-white px-2 py-1.5 flex items-center gap-1.5 pt-4">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-xs">🤖</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[8px]">Hair Studio AI</h3>
                    <p className="text-[6px] text-white/90">online</p>
                  </div>
                </div>
                
                  {/* Chat area - fills exactly from header to input */}
                  <div className="bg-[#e5ddd5] flex-1 flex flex-col justify-between p-2 py-3">
                    <div className="space-y-2">
                    {/* Customer message */}
                      <div className="flex justify-end">
                      <div className="bg-[#dcf8c6] rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                        <p className="text-gray-800 text-[9px] font-medium leading-tight">Hello, I'd like to book an appointment for tomorrow</p>
                      </div>
                  </div>
                  
                    {/* AI response 1 */}
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                        <p className="text-gray-800 text-[9px] font-medium leading-tight">Of course! Which service would you like? I have these options:</p>
                      </div>
                  </div>
                  
                    {/* AI response 2 - services */}
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                        <p className="text-gray-800 text-[9px] font-medium leading-tight">💇‍♀️ Haircut - $25 (45 min)<br />💇‍♀️ Coloring - $65 (90 min)<br />💇‍♀️ Wash - $15 (20 min)</p>
                      </div>
                  </div>
                  
                    {/* Customer choice */}
                    <div className="flex justify-end">
                      <div className="bg-[#dcf8c6] rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                        <p className="text-gray-800 text-[9px] font-medium leading-tight">Haircut please</p>
                      </div>
                  </div>
                  
                    {/* AI response 3 - time slots */}
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                        <p className="text-gray-800 text-[9px] font-medium leading-tight">Perfect! When works for you? Tomorrow I have available:<br />🕐 10:00 AM<br />🕐 2:00 PM<br />🕐 4:30 PM</p>
                      </div>
                  </div>
                  
                    {/* Customer time choice */}
                    <div className="flex justify-end">
                      <div className="bg-[#dcf8c6] rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                        <p className="text-gray-800 text-[9px] font-medium leading-tight">2:00 PM works</p>
                      </div>
                  </div>
                  
                    {/* Final confirmation */}
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                        <p className="text-gray-800 text-[9px] font-medium leading-tight">You have an appointment tomorrow at 2 PM ✅</p>
                      </div>
                    </div>
                    </div>
                  </div>
                  
                  {/* WhatsApp Input Bar */}
                  <div className="bg-gray-100 border-t border-gray-200 px-3 py-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-500 text-sm">😊</span>
                       <div className="flex-1 bg-white rounded-full px-2 py-1">
                         <div className="text-[9px] text-gray-400 font-medium">Type a message</div>
                       </div>
                      <span className="text-gray-500 text-sm">🎤</span>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Background accent elements */}
          
          <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-500/20 rounded-full blur-lg" />
        </div>,
    className: "lg:row-start-1 lg:row-end-3 lg:col-start-1 lg:col-end-2",
    hideCta: true
  }, {
    Icon: GearIcon,
    name: "Fully Personalized",
    description: "Customize the AI Agent to your services, FAQs and booking logic",
    href: "/features/personalization",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-blue-700/20" />
          
          {/* Compact Settings Interface */}
          <div className="absolute top-3 left-3 right-3 h-[45%] bg-slate-800/80 rounded-lg border border-slate-600/50 p-2 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white text-[10px] font-semibold">Settings</h4>
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            
            {/* Service Types Section */}
            <div className="mb-2">
              <p className="text-slate-300 text-[8px] font-medium mb-1">Services</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between bg-slate-700/60 rounded px-1.5 py-0.5">
                  <span className="text-white text-[7px]">📅 Consultation - €50</span>
                  <button className="text-emerald-400 text-[6px] hover:text-emerald-300">Edit</button>
                </div>
                <div className="flex items-center justify-between bg-slate-700/60 rounded px-1.5 py-0.5">
                  <span className="text-white text-[7px]">🔧 Service Call - €75</span>
                  <button className="text-emerald-400 text-[6px] hover:text-emerald-300">Edit</button>
                </div>
              </div>
              <button className="mt-1 text-emerald-400 text-[7px] font-medium hover:text-emerald-300">+ Add Service</button>
            </div>
            
            {/* Quick Toggles */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-[8px]">Auto confirmations</span>
                <div className="w-5 h-2.5 bg-emerald-500 rounded-full relative">
                  <div className="w-2 h-2 bg-white rounded-full absolute top-0.25 right-0.25 shadow-sm" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-[8px]">Send reminders</span>
                <div className="w-5 h-2.5 bg-emerald-500 rounded-full relative">
                  <div className="w-2 h-2 bg-white rounded-full absolute top-0.25 right-0.25 shadow-sm" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Background accent elements */}
          <div className="absolute bottom-3 right-3 w-4 h-4 bg-blue-400/40 rounded-full" />
        </div>,
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2"
  }, {
    Icon: CalendarIcon,
    name: "Advanced Dashboard & Own Calendar",
    description: "Get your own professional calendar with advanced dashboard for complete control",
    href: "/features/dashboard",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          
          {/* Analytics Section - Top 35% */}
          <div className="absolute top-2 left-2 right-2 h-[35%] bg-slate-800/90 rounded-lg border border-slate-700/50 p-2 backdrop-blur-sm">
            {/* Analytics Header */}
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-white text-[7px] font-semibold">Analytics Overview</h4>
              <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            
            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-1 mb-1">
              <div className="bg-blue-600/80 rounded px-1 py-0.5">
                <div className="text-white text-[6px] font-bold">2.3m</div>
                <div className="text-blue-100 text-[4px]">Avg Response</div>
              </div>
              <div className="bg-blue-600/80 rounded px-1 py-0.5">
                <div className="text-white text-[6px] font-bold">8.5%</div>
                <div className="text-blue-100 text-[4px]">No-show Rate</div>
              </div>
              <div className="bg-blue-600/80 rounded px-1 py-0.5">
                <div className="text-white text-[6px] font-bold">12.3%</div>
                <div className="text-blue-100 text-[4px]">Cancellation</div>
              </div>
              <div className="bg-blue-600/80 rounded px-1 py-0.5">
                <div className="text-white text-[6px] font-bold">67.8%</div>
                <div className="text-blue-100 text-[4px]">Conversion</div>
              </div>
            </div>
            
            {/* Peak Hours Chart */}
            <div className="text-[5px] text-slate-400 mb-0.5">Peak Hours</div>
            <div className="flex items-end gap-px h-3">
              {[2, 3, 4, 6, 8, 12, 8, 4, 2].map((height, i) => (
                <div key={i} className={`w-1 ${i === 4 ? 'bg-red-500' : 'bg-slate-600'} rounded-t-sm`} 
                     style={{ height: `${height * 2}px` }} />
              ))}
            </div>
          </div>
          
          {/* Calendar Section - Middle 40% */}
          <div className="absolute top-[37%] left-2 right-2 h-[40%] bg-slate-800/90 rounded-lg border border-slate-700/50 p-2 backdrop-blur-sm">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <button className="text-slate-400 text-[6px] hover:text-white">‹</button>
                <span className="text-white text-[7px] font-semibold">July 2025</span>
                <button className="text-slate-400 text-[6px] hover:text-white">›</button>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex text-[5px] bg-slate-700/60 rounded overflow-hidden">
                  <button className="px-0.5 py-0.5 text-slate-400">M</button>
                  <button className="px-0.5 py-0.5 bg-emerald-600 text-white">W</button>
                  <button className="px-0.5 py-0.5 text-slate-400">Y</button>
                </div>
                <button className="bg-emerald-600 text-white text-[5px] px-1 py-0.5 rounded">+ New</button>
              </div>
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px text-[4px]">
              {/* Day Headers */}
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                <div key={day} className="text-slate-400 text-center py-0.5 font-medium">{day}</div>
              ))}
              
              {/* Calendar Dates */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].map((date) => (
                <div key={date} className="relative">
                  <div className={`text-center py-0.5 h-2 flex items-center justify-center text-[4px] ${
                    [9, 15, 22].includes(date) ? 'bg-emerald-600 text-white rounded-sm' : 'text-slate-300 hover:bg-slate-700/50 rounded-sm'
                  }`}>
                    {date}
                  </div>
                  {[9, 15, 22].includes(date) && (
                    <div className="absolute -bottom-0.5 left-0 right-0 h-px bg-emerald-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Background accent elements */}
          <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500/20 rounded-full" />
          <div className="absolute bottom-1 left-1 w-3 h-3 bg-slate-600/30 rounded-full" />
        </div>,
    className: "lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-3"
  }, {
    Icon: Link2Icon,
    name: "Connect Your Existing Calendar",
    description: "Integrate seamlessly with Google Calendar, Outlook, Calendly and more",
    href: "/features/integration",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-blue-700/20" />
          <div className="absolute top-3 left-3 w-3 h-3 border border-blue-400/40 rounded-full" />
          <div className="absolute top-6 left-8 w-2 h-2 bg-blue-500/50 rounded-full" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border border-blue-300/30 rounded" />
        </div>,
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-4"
  }, {
    Icon: BellIcon,
    name: "Automatic Reminders",
    description: "Sends confirmation and reminder messages to reduce no-shows",
    href: "/features/reminders",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          <div className="absolute top-4 right-4 w-6 h-1 bg-emerald-500/40 rounded-full animate-pulse" />
          <div className="absolute bottom-6 left-4 text-emerald-400/20 text-4xl">📧</div>
        </div>,
    className: "lg:row-start-3 lg:row-end-4 lg:col-start-1 lg:col-end-2"
  }, {
    Icon: BarChart3Icon,
    name: "Detailed Analytics",
    description: "Track booking rates, popular times and generated revenue",
    href: "/features/analytics",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-blue-700/20" />
          <div className="absolute top-4 left-4 w-8 h-1 bg-blue-500/40 rounded" />
          <div className="absolute top-7 left-6 w-6 h-1 bg-blue-400/50 rounded" />
          <div className="absolute top-10 left-4 w-10 h-1 bg-blue-300/30 rounded" />
        </div>,
    className: "lg:col-start-3 lg:col-end-4 lg:row-start-3 lg:row-end-4"
  }, {
    Icon: GlobeIcon,
    name: "Multi-language Support",
    description: "Automatically communicates in your customers' preferred language",
    href: "/features/multilingual",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          <div className="absolute top-4 left-4 text-emerald-400/30 text-2xl">🌍</div>
          <div className="absolute bottom-4 right-4 w-3 h-3 bg-emerald-500/40 rounded-full" />
        </div>,
    className: "lg:col-start-1 lg:col-end-3 lg:row-start-4 lg:row-end-5"
  }, {
    Icon: MonitorIcon,
    name: "Real-time Dashboard Monitoring",
    description: "View live bookings, performance and customer interactions",
    href: "/features/monitoring",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-blue-700/20" />
          <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500/60 rounded-full animate-pulse" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border border-blue-400/30 rounded" />
        </div>,
    className: "lg:col-start-3 lg:col-end-4 lg:row-start-4 lg:row-end-5"
  }];
  const stats = [{
    value: "24/7",
    label: "Always Working"
  }, {
    value: "∞",
    label: "Unlimited Capacity"
  }, {
    value: "0%",
    label: "Human Errors"
  }];
  return <section className="py-12 md:py-24 px-3 md:px-4 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
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
            {bookingFeatures.map((feature, idx) => <BentoCard key={idx} {...feature} />)}
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
              {stats.map((stat, index) => <div key={index} className="group text-center hover:transform hover:scale-105 transition-all duration-300">
                  <div className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 text-emerald-400 group-hover:text-emerald-300 transition-colors">{stat.value}</div>
                  <div className="text-slate-400 text-xs md:text-sm uppercase tracking-wider group-hover:text-slate-300 transition-colors">{stat.label}</div>
                </div>)}
            </div>

            {/* Mobile: Stats grid (replaced carousel) */}
            <div className="md:hidden">
              <div className="grid grid-cols-3 gap-4">
                {stats.map((stat, index) => <div key={index} className="text-center bg-slate-800/30 rounded-xl p-4">
                    <div className="text-xl font-bold mb-1 text-emerald-400">{stat.value}</div>
                    <div className="text-slate-400 text-xs uppercase tracking-wider">{stat.label}</div>
                  </div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default Features;