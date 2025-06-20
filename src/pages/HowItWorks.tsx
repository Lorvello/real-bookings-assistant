
import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Phone, MessageCircle, Settings2, Zap, Users, Shield } from 'lucide-react';

export default function HowItWorks() {
  const handleBookCall = () => {
    window.open('https://bookingsassistentie.com/afspraak', '_blank');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">How it works</h1>
              <p className="text-gray-600">🧾 Twee Plannen – Wat krijg je precies?</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <p className="text-lg text-gray-700 leading-relaxed">
              Je kunt kiezen uit twee abonnementen. Hier leggen we uit wat het verschil is, 
              zodat je weet wat je kunt verwachten en wat je jouw klanten moet vertellen.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Plan 1 - Standaard */}
            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🟢</span>
                  </div>
                </div>
                <CardTitle className="text-xl text-green-800">Plan 1 – Standaard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Je maakt een account aan bij ons</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Je krijgt één algemeen WhatsApp-nummer dat je deelt met andere bedrijven</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Dit nummer gebruik je om je afsprakenassistent te activeren</p>
                  </div>
                </div>

                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <span className="text-yellow-600 font-semibold text-sm">⚠️ Let op:</span>
                    <div className="text-sm text-yellow-800">
                      <p className="mb-2">Omdat meerdere bedrijven ditzelfde nummer gebruiken, moet jouw klant bij het eerste bericht altijd vermelden:</p>
                      <div className="bg-gray-800 text-green-400 p-3 rounded font-mono text-sm">
                        "Plan me in bij [jouw bedrijfsnaam]"
                      </div>
                      <p className="mt-2 text-xs">➡️ Daarna weet het systeem dat dit nummer bij jouw bedrijf hoort en wordt alles automatisch geregeld.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                    <Zap className="h-4 w-4 mr-2" />
                    Voordelen:
                  </h4>
                  <div className="space-y-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300 flex items-center w-fit">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Snel starten
                    </Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300 flex items-center w-fit">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Goedkoop
                    </Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300 flex items-center w-fit">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Geen installatie nodig
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan 2 - Premium */}
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🔵</span>
                  </div>
                </div>
                <CardTitle className="text-xl text-blue-800">Plan 2 – Premium</CardTitle>
                <p className="text-sm text-blue-600">(eigen nummer & branding)</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Je krijgt je eigen unieke WhatsApp-nummer</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Dat nummer is alleen van jou, dus klanten hoeven jouw bedrijfsnaam niet te noemen</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Settings2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Je kunt ook eigen branding toevoegen (zoals naam, profielfoto, beschrijving)</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">Dit is ideaal voor een professionele uitstraling en volledige controle</p>
                  </div>
                </div>

                <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-3">🤔 Hoe aanvragen?</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    👉 Boek een korte call met ons via:
                  </p>
                  <Button 
                    onClick={handleBookCall}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-3"
                  >
                    bookingsassistentie.com/afspraak
                  </Button>
                  <p className="text-xs text-blue-600">
                    Tijdens het gesprek regelen we de koppeling en activeren we je persoonlijke nummer.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                    <Zap className="h-4 w-4 mr-2" />
                    Voordelen:
                  </h4>
                  <div className="space-y-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300 flex items-center w-fit">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Volledige controle
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300 flex items-center w-fit">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Geen verwarring voor klanten
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300 flex items-center w-fit">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Professionele look & feel
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-dashed border-gray-300">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  Welk plan past bij jou? 🤔
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Start met Plan 1 om snel te beginnen, of ga direct voor Plan 2 voor een volledig gepersonaliseerde ervaring. 
                  Je kunt altijd later upgraden!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
