import React from 'react';
import WhatsAppChat from './WhatsAppChat';
import CalendarMockup from './CalendarMockup';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';

const ProcessSection = () => {
  return (
    <section className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 py-20 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Zie Hoe Het Werkt
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Van eerste bericht tot bevestigde afspraak in minder dan 30 seconden. 
            Kijk hoe onze AI het hele boekingsproces automatisch afhandelt.
          </p>
        </div>

        {/* Process flow */}
        <div className="space-y-16">
          {/* Step 1: WhatsApp Chat */}
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 text-white rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-br from-emerald-500 to-green-500">
                  1
                </div>
                <h3 className="text-2xl font-bold text-white">Klant Start WhatsApp Chat</h3>
              </div>
              <p className="text-lg text-slate-300 leading-relaxed">
                Je klant stuurt een eenvoudig bericht waarin ze hun behoefte uiten. Onze AI agent 
                reageert direct met intelligente vragen om hun voorkeuren te begrijpen 
                en de perfecte afspraaktijd te vinden.
              </p>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 backdrop-blur-sm">
                <p className="font-medium text-emerald-400">✨ Geen apps om te downloaden, geen complexe formulieren om in te vullen</p>
              </div>
            </div>
            
            <div className="flex-1 animate-appear opacity-100 delay-300">
              <WhatsAppChat />
            </div>
          </div>

          {/* Step 2: Calendar Result */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 text-white rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                  2
                </div>
                <h3 className="text-2xl font-bold text-white">Afspraak Automatisch Geboekt</h3>
              </div>
              <p className="text-lg text-slate-300 leading-relaxed">
                De AI bevestigt de afspraakdetails en voegt deze direct toe aan je agenda. 
                Zowel jij als je klant ontvangen bevestigingsberichten met alle details.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 backdrop-blur-sm">
                <p className="font-medium text-blue-400">📅 Synchroniseert met Google Calendar, Outlook en meer</p>
              </div>
            </div>
            
            <div className="flex-1 animate-appear opacity-100 delay-700">
              <CalendarMockup />
            </div>
          </div>
        </div>

        {/* AI Agent Test Section */}
        <div className="mt-24 space-y-8">
          <div className="text-center">
            <div className="flex items-center gap-4 justify-center mb-6">
              <div className="w-12 h-12 text-white rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-br from-purple-500 to-pink-500">
                3
              </div>
              <h3 className="text-2xl font-bold text-white">Test De AI Agent Zelf</h3>
            </div>
            <p className="text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto mb-8">
              Probeer het zelf uit! Chat met onze AI agent en ervaar hoe snel en natuurlijk 
              het boekingsproces verloopt. Geen registratie nodig.
            </p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <AIAgentTestChat />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
