
import React from 'react';
import Navbar from '@/components/Navbar';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { Calendar, MessageCircle, CheckCircle, Clock, Users, Zap, ArrowRight, Smartphone, Settings } from 'lucide-react';

const SeeHowItWorks = () => {
  const benefits = [
    {
      icon: Clock,
      title: "24/7 Beschikbaar",
      description: "Jouw AI-assistent slaapt nooit en plant afspraken in rond de klok"
    },
    {
      icon: Users,
      title: "Onbeperkte Capaciteit",
      description: "Behandel honderden boekingsverzoeken tegelijkertijd"
    },
    {
      icon: Zap,
      title: "Direct Antwoord",
      description: "Klanten krijgen onmiddellijk reactie, geen wachten meer"
    },
    {
      icon: CheckCircle,
      title: "100% Accuraat",
      description: "AI begrijpt context en boekt elke keer correct"
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
            Hoe <span className="text-green-600">werkt het?</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            Leg per stap uit hoe eenvoudig het is om aan de slag te gaan met ons systeem. 
            Geen moeilijke installatie, geen tech-gedoe — gewoon direct live.
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
                  <h2 className="text-4xl font-bold text-gray-900">Vul je gegevens in</h2>
                </div>
                
                <p className="text-xl text-gray-600 mb-8">
                  Laat ons weten wie je bent: jouw bedrijfsnaam, website en e-mailadres. 
                  Koppel vervolgens eenvoudig je agenda:
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
                    Ons systeem leest automatisch je beschikbaarheid uit. Geen gedoe, alles realtime gekoppeld.
                  </p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-8 rounded-2xl">
                <div className="text-center">
                  <Settings className="w-16 h-16 text-green-600 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Eenvoudige Setup</h3>
                  <p className="text-gray-600 mb-6">
                    Binnen 5 minuten volledig geconfigureerd en klaar voor gebruik
                  </p>
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Agenda gekoppeld</span>
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
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">WhatsApp Nummer Opties</h3>
                  
                  <div className="space-y-6">
                    <div className="border border-green-200 bg-green-50 p-6 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">1</span>
                        </div>
                        <h4 className="font-semibold text-gray-900">Wij regelen een nummer (aanbevolen)</h4>
                      </div>
                      <p className="text-gray-700 text-sm">
                        Supersnel, zonder gedoe. Binnen enkele minuten is je unieke WhatsApp-nummer live.
                      </p>
                    </div>
                    
                    <div className="border border-gray-200 p-6 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">2</span>
                        </div>
                        <h4 className="font-semibold text-gray-900">Je eigen nummer gebruiken</h4>
                      </div>
                      <p className="text-gray-700 text-sm">
                        Dat kan ook. Wij helpen je stap voor stap om het veilig te koppelen aan ons systeem.
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
                  <h2 className="text-4xl font-bold text-gray-900">Kies je WhatsApp-nummer</h2>
                </div>
                
                <p className="text-xl text-gray-600 mb-8">
                  Je hebt twee opties:
                </p>
                
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
                  <p className="text-blue-800 font-medium">
                    Welke optie je ook kiest — wij zorgen dat alles soepel werkt, 
                    zonder dat jij iets technisch hoeft te doen.
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
                  <h2 className="text-4xl font-bold text-gray-900">Je WhatsApp-assistent is live</h2>
                </div>
                
                <p className="text-xl text-gray-600 mb-8">
                  Klaar voor actie. Vanaf nu kunnen jouw klanten via WhatsApp:
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-gray-900">Afspraken inplannen (gebaseerd op jouw agenda)</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-gray-900">Afspraken verzetten of annuleren</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-gray-900">Direct persoonlijk geholpen worden, zonder wachttijd</span>
                  </div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl">
                  <p className="text-purple-800 font-medium">
                    Je hoeft zelf niks te doen. Jouw slimme assistent regelt alles — 24/7, 
                    volledig automatisch, in jouw stijl.
                  </p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-8 rounded-2xl">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-purple-600 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">24/7 Actief</h3>
                  <p className="text-gray-600 mb-6">
                    Jouw assistent is altijd beschikbaar voor je klanten
                  </p>
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">Live en actief</span>
                    </div>
                    <p className="text-xs text-gray-500">Automatisch boeken sinds vandaag</p>
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
                Jij ontvangt automatisch reminders, updates én inzichten over wie wat geboekt heeft — 
                rechtstreeks in je dashboard of inbox.
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
              Klaar om tijd te besparen én nooit meer een klant mis te lopen?
            </h2>
            <p className="text-xl text-green-100 mb-8">
              Start vandaag nog — je assistent staat al klaar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-green-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 justify-center">
                Start Nu
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-colors">
                Bekijk Demo
              </button>
            </div>
          </div>
        </section>
      </ScrollAnimatedSection>
    </div>
  );
};

export default SeeHowItWorks;
