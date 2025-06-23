
import React from 'react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { CheckCircle, Settings, Smartphone, MessageCircle, Star, Shield, Zap } from 'lucide-react';

const StepSection = () => {
  const calendarOptions = [
    {
      name: "Google Calendar",
      logo: "📅"
    },
    {
      name: "Calendly",
      logo: "📆"
    },
    {
      name: "Cal.com",
      logo: "🗓️"
    }
  ];

  return (
    <>
      {/* Step 1 */}
      <ScrollAnimatedSection>
        <section className="py-24 px-4 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
          </div>
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <span className="text-white text-2xl font-bold">1</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold text-white">Fill in your details</h2>
                </div>
                
                <p className="text-xl text-slate-300 mb-10 leading-relaxed">
                  Let us know who you are: your business name, website and email address. 
                  Then easily connect your calendar:
                </p>
                
                <div className="space-y-4 mb-10">
                  {calendarOptions.map((calendar, index) => (
                    <div key={index} className="flex items-center gap-6 p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-300">
                      <span className="text-3xl">{calendar.logo}</span>
                      <span className="text-xl font-semibold text-white">{calendar.name}</span>
                    </div>
                  ))}
                </div>
                
                <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-8 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                    <p className="text-emerald-300 font-semibold text-lg">
                      Automatic Sync
                    </p>
                  </div>
                  <p className="text-emerald-200">
                    Our system automatically reads your availability. No hassle, everything connected in real-time.
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-10 shadow-xl">
                <div className="text-center">
                  <div className="relative mb-8">
                    <Settings className="w-20 h-20 text-emerald-400 mx-auto" />
                    <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full blur opacity-75"></div>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-6">Simple Setup</h3>
                  <p className="text-slate-300 mb-8 text-lg">
                    Fully configured and ready to use within 5 minutes
                  </p>
                  <div className="bg-slate-700/50 backdrop-blur-sm border border-slate-600/50 p-6 rounded-2xl">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="font-semibold text-slate-300">Calendar connected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollAnimatedSection>

      {/* Step 2 */}
      <ScrollAnimatedSection delay={100}>
        <section className="py-24 px-4 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
          </div>
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="order-2 lg:order-1">
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-10 shadow-xl">
                  <div className="text-center mb-8">
                    <div className="relative mb-6">
                      <Smartphone className="w-20 h-20 text-blue-400 mx-auto" />
                      <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur opacity-75"></div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">WhatsApp Number Options</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10 p-8 rounded-2xl relative overflow-hidden backdrop-blur-sm">
                      <div className="absolute top-4 right-4">
                        <Star className="w-6 h-6 text-emerald-400 fill-current" />
                      </div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">1</span>
                        </div>
                        <h4 className="text-xl font-bold text-white">We arrange a number for you</h4>
                        <span className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">Recommended</span>
                      </div>
                      <p className="text-slate-300">
                        Super fast, no hassle. Your unique WhatsApp number is live within minutes.
                      </p>
                    </div>
                    
                    <div className="border border-slate-600/50 p-8 rounded-2xl bg-slate-700/50 backdrop-blur-sm">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-slate-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">2</span>
                        </div>
                        <h4 className="text-xl font-bold text-white">Prefer to use your own number?</h4>
                      </div>
                      <p className="text-slate-300">
                        That's possible too. We'll help you step by step to safely connect it to our system.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="order-1 lg:order-2">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <span className="text-white text-2xl font-bold">2</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold text-white">Choose your WhatsApp number</h2>
                </div>
                
                <p className="text-xl text-slate-300 mb-10 leading-relaxed">
                  You have two options to get started:
                </p>
                
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 p-8 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-6 h-6 text-blue-400" />
                    <p className="text-blue-300 font-semibold text-lg">
                      Seamless Integration
                    </p>
                  </div>
                  <p className="text-blue-200">
                    Whichever option you choose — we ensure everything works smoothly, 
                    without you having to do anything technical.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollAnimatedSection>

      {/* Step 3 */}
      <ScrollAnimatedSection delay={200}>
        <section className="py-24 px-4 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
          </div>
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <span className="text-white text-2xl font-bold">3</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold text-white">Your WhatsApp assistant is live</h2>
                </div>
                
                <p className="text-xl text-slate-300 mb-10 leading-relaxed">
                  Ready for action. From now on, your customers can via WhatsApp:
                </p>
                
                <div className="space-y-4 mb-10">
                  <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl backdrop-blur-sm">
                    <CheckCircle className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                    <span className="text-white text-lg font-medium">Schedule appointments (based on your calendar)</span>
                  </div>
                  <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl backdrop-blur-sm">
                    <CheckCircle className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                    <span className="text-white text-lg font-medium">Reschedule or cancel appointments</span>
                  </div>
                  <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl backdrop-blur-sm">
                    <CheckCircle className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                    <span className="text-white text-lg font-medium">Get immediate personal help, without waiting time</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-8 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Zap className="w-6 h-6 text-purple-400" />
                    <p className="text-purple-300 font-semibold text-lg">
                      Fully Automated
                    </p>
                  </div>
                  <p className="text-purple-200">
                    You don't have to do anything yourself. Your smart assistant handles everything — 24/7, 
                    fully automatic, in your style.
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-10 shadow-xl">
                <div className="text-center">
                  <div className="relative mb-8">
                    <MessageCircle className="w-20 h-20 text-purple-400 mx-auto" />
                    <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur opacity-75"></div>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-6">24/7 Active</h3>
                  <p className="text-slate-300 mb-8 text-lg">
                    Your assistant is always available for your customers
                  </p>
                  <div className="bg-slate-700/50 backdrop-blur-sm border border-slate-600/50 p-6 rounded-2xl">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <div className="w-4 h-4 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="font-semibold text-slate-300">Live and active</span>
                    </div>
                    <p className="text-sm text-slate-400">Automatically booking since today</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollAnimatedSection>
    </>
  );
};

export default StepSection;
