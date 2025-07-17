import React, { useState } from 'react';
import { Copy, Check, QrCode, Phone, MessageCircle, Clock, Users, Zap, Shield, BarChart3, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface WhatsAppBookingAssistantProps {
  calendarId: string;
}

export function WhatsAppBookingAssistant({ calendarId }: WhatsAppBookingAssistantProps) {
  const [copied, setCopied] = useState(false);
  
  // For demo purposes - in production this would come from the calendar settings
  const whatsappNumber = "+31 6 12345678";
  const formattedNumber = whatsappNumber.replace(/\s+/g, '');

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(formattedNumber);
      setCopied(true);
      toast.success('Telefoonnummer gekopieerd naar klembord');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Kon telefoonnummer niet kopiëren');
    }
  };

  const generateQRCode = () => {
    const whatsappUrl = `https://wa.me/${formattedNumber.replace('+', '')}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(whatsappUrl)}`;
  };

  const generateWhatsAppLink = () => {
    return `https://wa.me/${formattedNumber.replace('+', '')}`;
  };

  const features = [
    {
      icon: MessageCircle,
      title: "24/7 Beschikbaarheid",
      description: "Klanten kunnen altijd berichten sturen, ook buiten kantooruren"
    },
    {
      icon: Clock,
      title: "Directe Responses",
      description: "Gemiddelde responstijd van minder dan 2 seconden"
    },
    {
      icon: Users,
      title: "Meerdere Klanten",
      description: "Behandelt onbeperkt aantal gesprekken tegelijkertijd"
    },
    {
      icon: Zap,
      title: "Automatische Boekingen",
      description: "Volledige boekingsprocessen zonder menselijke tussenkomst"
    },
    {
      icon: Shield,
      title: "Veilig & Betrouwbaar",
      description: "End-to-end versleuteling en GDPR-compliant"
    },
    {
      icon: BarChart3,
      title: "Gedetailleerde Analytics",
      description: "Volledige inzichten in klantinteracties en conversies"
    }
  ];

  const integrationOptions = [
    {
      title: "Website Integratie",
      description: "Voeg een WhatsApp widget toe aan je website",
      action: "Widget Code Krijgen"
    },
    {
      title: "Social Media",
      description: "Deel het nummer op Facebook, Instagram en LinkedIn",
      action: "Delen"
    },
    {
      title: "Visitekaartjes",
      description: "Voeg de QR-code toe aan je fysieke materialen",
      action: "QR Code Downloaden"
    },
    {
      title: "E-mail Handtekening",
      description: "Voeg het nummer toe aan je e-mail handtekening",
      action: "Template Krijgen"
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Phone className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">
          Jouw WhatsApp Booking Assistant
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          De AI-gebaseerde boekingsassistent die 24/7 beschikbaar is voor je klanten. 
          Automatiseer je boekingsproces en verhoog je conversies.
        </p>
      </div>

      {/* Main Card with WhatsApp Number */}
      <Card className="max-w-4xl mx-auto shadow-xl border-2 border-green-100">
        <CardHeader className="text-center bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl">
            <MessageCircle className="h-6 w-6 text-green-600" />
            WhatsApp Nummer
          </CardTitle>
          <CardDescription className="text-base">
            Deel dit nummer met klanten voor directe AI-gebaseerde boekingen
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Side - Number and Actions */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <div className="text-4xl font-mono font-bold text-foreground mb-4">
                  {whatsappNumber}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={handleCopyNumber}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Gekopieerd!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Kopieer Nummer
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => window.open(generateWhatsAppLink(), '_blank')}
                    variant="outline"
                    className="gap-2 border-green-600 text-green-600 hover:bg-green-50"
                    size="lg"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Test Direct
                  </Button>
                </div>
              </div>
              
              {/* Status Badge */}
              <div className="text-center">
                <Badge variant="default" className="bg-green-100 text-green-800 px-4 py-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></div>
                  AI Assistant Online
                </Badge>
              </div>
            </div>

            {/* Right Side - QR Code */}
            <div className="text-center space-y-4">
              <div className="inline-block bg-white p-6 rounded-xl shadow-lg">
                <img
                  src={generateQRCode()}
                  alt="WhatsApp QR Code"
                  className="mx-auto rounded-lg"
                  width={300}
                  height={300}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Scan om direct WhatsApp te openen
              </p>
              <Button variant="outline" className="gap-2" size="sm">
                <QrCode className="h-4 w-4" />
                QR Code Downloaden
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Waarom onze AI Assistant?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-all duration-300 hover-scale">
              <CardContent className="p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                  <feature.icon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Integration Options */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6">Integratie Mogelijkheden</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {integrationOptions.map((option, index) => (
            <Card key={index} className="hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{option.title}</h3>
                    <p className="text-muted-foreground text-sm">{option.description}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  {option.action}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Usage Instructions */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Implementatie Handleiding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Voor Nieuwe Klanten:</h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">1.</span>
                    <span>Klant stuurt bericht naar WhatsApp nummer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">2.</span>
                    <span>AI verwelkomt klant en vraagt naar gewenste service</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">3.</span>
                    <span>Beschikbare tijden worden automatisch getoond</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">4.</span>
                    <span>Klant kiest tijd en bevestigt afspraak</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">5.</span>
                    <span>Automatische bevestiging en agenda-item</span>
                  </li>
                </ol>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Voor Bestaande Klanten:</h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">1.</span>
                    <span>AI herkent klant automatisch</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">2.</span>
                    <span>Toont vorige afspraken en voorkeuren</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">3.</span>
                    <span>Stelt aangepaste tijden voor</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">4.</span>
                    <span>Snellere boekingsproces</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">5.</span>
                    <span>Gepersonaliseerde service</span>
                  </li>
                </ol>
              </div>
            </div>
            
            <Separator />
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Pro Tip</h3>
              <p className="text-blue-800 text-sm">
                Plaats dit nummer prominent op je website en social media voor de beste resultaten. 
                Klanten prefereren WhatsApp boven traditionele boekingsformulieren!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}