
import React from 'react';
import Navbar from '@/components/Navbar';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { Calendar, MessageCircle, CheckCircle, Clock, Users, Zap, ArrowRight, Smartphone, Settings } from 'lucide-react';

const SeeHowItWorks = () => {
  const benefits = [
    {
      icon: Clock,
      title: "24/7 Available",
      description: "Your AI assistant never sleeps and schedules appointments around the clock"
    },
    {
      icon: Users,
      title: "Unlimited Capacity",
      description: "Handle hundreds of booking requests simultaneously"
    },
    {
      icon: Zap,
      title: "Instant Response",
      description: "Customers get immediate replies, no more waiting"
    },
    {
      icon: CheckCircle,
      title: "100% Accurate",
      description: "AI understands context and books correctly every time"
    }
  ];

  const calendarOptions = [
    { name: "Google Calendar", logo: "📅" },
    { name: "Calendly", logo: "📆" },
    { name: "Cal.com", logo: "🗓️" }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-emerald-50 py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            How does <span className="text-green-600">it work?</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            Step by step explanation of how easy it is to get started with our system. 
            No complicated installation, no tech hassle — just go live immediately.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <benefit.icon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Step 1 */}
      <ScrollAnimatedSection>
        <section className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl font-bold">1</span>
                  </div>
                  <h2 className="text-4xl font-bold text-gray-900">Fill in your details</h2>
                </div>
                
                <p className="text-xl text-gray-600 mb-8">
                  Let us know who you are: your business name, website and email address. 
                  Then easily connect your calendar:
                </p>
                
                <div className="space-y-4 mb-8">
                  {calendarOptions.map((calendar, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <span className="text-2xl">{calendar.logo}</span>
                      <span className="text-lg font-medium text-gray-900">{calendar.name}</span>
                    </div>
                  ))}
                </div>
                
                <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
                  <p className="text-green-800 font-medium">
                    Our system automatically reads your availability. No hassle, everything connected in real-time.
                  </p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-8 rounded-2xl">
                <div className="text-center">
                  <Settings className="w-16 h-16 text-green-600 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Simple Setup</h3>
                  <p className="text-gray-600 mb-6">
                    Fully configured and ready to use within 5 minutes
                  </p>
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Calendar connected</span>
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
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="bg-white p-8 rounded-2xl shadow-lg">
                  <Smartphone className="w-16 h-16 text-green-600 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">WhatsApp Number Options</h3>
                  
                  <div className="space-y-6">
                    <div className="border border-green-200 bg-green-50 p-6 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">1</span>
                        </div>
                        <h4 className="font-semibold text-gray-900">We arrange a number for you (recommended)</h4>
                      </div>
                      <p className="text-gray-700 text-sm">
                        Super fast, no hassle. Your unique WhatsApp number is live within minutes.
                      </p>
                    </div>
                    
                    <div className="border border-gray-200 p-6 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">2</span>
                        </div>
                        <h4 className="font-semibold text-gray-900">Prefer to use your own number?</h4>
                      </div>
                      <p className="text-gray-700 text-sm">
                        That's possible too. We'll help you step by step to safely connect it to our system.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="order-1 lg:order-2">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl font-bold">2</span>
                  </div>
                  <h2 className="text-4xl font-bold text-gray-900">Choose your WhatsApp number</h2>
                </div>
                
                <p className="text-xl text-gray-600 mb-8">
                  You have two options:
                </p>
                
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
                  <p className="text-blue-800 font-medium">
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
        <section className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl font-bold">3</span>
                  </div>
                  <h2 className="text-4xl font-bold text-gray-900">Your WhatsApp assistant is live</h2>
                </div>
                
                <p className="text-xl text-gray-600 mb-8">
                  Ready for action. From now on, your customers can via WhatsApp:
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-gray-900">Schedule appointments (based on your calendar)</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-gray-900">Reschedule or cancel appointments</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-gray-900">Get immediate personal help, without waiting time</span>
                  </div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl">
                  <p className="text-purple-800 font-medium">
                    You don't have to do anything yourself. Your smart assistant handles everything — 24/7, 
                    fully automatic, in your style.
                  </p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-8 rounded-2xl">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-purple-600 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">24/7 Active</h3>
                  <p className="text-gray-600 mb-6">
                    Your assistant is always available for your customers
                  </p>
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">Live and active</span>
                    </div>
                    <p className="text-xs text-gray-500">Automatically booking since today</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollAnimatedSection>

      {/* Bonus Section */}
      <ScrollAnimatedSection delay={100}>
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white p-8 rounded-2xl mb-12">
              <h3 className="text-2xl font-bold mb-4">🎉 Bonus</h3>
              <p className="text-lg">
                You automatically receive reminders, updates and insights about who booked what — 
                directly in your dashboard or inbox.
              </p>
            </div>
          </div>
        </section>
      </ScrollAnimatedSection>
      
      {/* CTA Section */}
      <ScrollAnimatedSection delay={200}>
        <section className="bg-gradient-to-br from-green-600 to-emerald-600 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to save time and never miss a customer again?
            </h2>
            <p className="text-xl text-green-100 mb-8">
              Start today — your assistant is already waiting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-green-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 justify-center">
                Start Now
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-colors">
                View Demo
              </button>
            </div>
          </div>
        </section>
      </ScrollAnimatedSection>
    </div>
  );
};

export default SeeHowItWorks;
