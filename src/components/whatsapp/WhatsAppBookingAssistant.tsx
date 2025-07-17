import React, { useState } from 'react';
import { Copy, Check, QrCode, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(whatsappUrl)}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Jouw WhatsApp Booking Assistant
        </h2>
        <p className="text-muted-foreground">
          Dit is het telefoonnummer van je AI-agent voor automatische boekingen
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Phone className="h-5 w-5 text-green-600" />
            WhatsApp Nummer
          </CardTitle>
          <CardDescription>
            Deel dit nummer met klanten of plaats het op je website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phone Number Display */}
          <div className="text-center">
            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="text-3xl font-mono font-bold text-foreground mb-2">
                {whatsappNumber}
              </div>
              <Button
                onClick={handleCopyNumber}
                variant="outline"
                className="gap-2"
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
            </div>
          </div>

          {/* QR Code */}
          <div className="text-center">
            <div className="inline-block bg-white p-4 rounded-lg shadow-sm">
              <img
                src={generateQRCode()}
                alt="WhatsApp QR Code"
                className="mx-auto"
                width={200}
                height={200}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Scan om WhatsApp te openen
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Hoe te gebruiken:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">1.</span>
                <span>Deel dit nummer met je klanten via je website, social media of visitekaartjes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">2.</span>
                <span>Klanten kunnen direct berichten sturen naar dit WhatsApp nummer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">3.</span>
                <span>De AI-agent helpt automatisch bij het maken van afspraken</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">4.</span>
                <span>Alle gesprekken zijn terug te vinden in de andere tabs</span>
              </li>
            </ul>
          </div>

          {/* Status Badge */}
          <div className="text-center">
            <Badge variant="default" className="bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
              AI Assistant Actief
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}