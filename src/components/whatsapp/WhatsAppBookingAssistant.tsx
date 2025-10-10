import React, { useState, useEffect } from 'react';
import { Copy, Check, QrCode, Phone, Download, AlertTriangle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { supabase } from '@/integrations/supabase/client';
import QRCodeSVG from 'react-qr-code';

interface WhatsAppBookingAssistantProps {
  userId: string;
}

export function WhatsAppBookingAssistant({ userId }: WhatsAppBookingAssistantProps) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [cacheBust, setCacheBust] = useState(0);
  
  const {
    platformNumber,
    qrUrl,
    whatsappLink,
    loading,
    generating,
    qrExists,
    needsMigration,
    generateQR
  } = useWhatsAppSettings(userId);

  useEffect(() => {
    const loadBusinessData = async () => {
      const { data } = await supabase
        .from('users')
        .select('business_name')
        .eq('id', userId)
        .single();
      
      setBusinessName(data?.business_name || 'Ons bedrijf');
      setTrackingCode(userId.substring(0, 8).toUpperCase());
    };
    
    loadBusinessData();
  }, [userId]);

  // Force refresh QR image when a new URL is set to bypass browser cache
  useEffect(() => {
    if (qrUrl) setCacheBust(Date.now());
  }, [qrUrl]);

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(platformNumber);
      setCopied(true);
      toast.success('Nummer gekopieerd');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Kon nummer niet kopiëren');
    }
  };

  const handleCopyLink = async () => {
    if (!whatsappLink) return;
    
    try {
      await navigator.clipboard.writeText(whatsappLink);
      setLinkCopied(true);
      toast.success('WhatsApp link gekopieerd');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast.error('Kon link niet kopiëren');
    }
  };

  const downloadQRCode = async () => {
    if (!qrUrl) return;
    
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `whatsapp-qr-${userId.substring(0, 8)}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code gedownload');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: QR Code */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <QrCode className="h-5 w-5 text-green-500" />
              WhatsApp QR Code
            </CardTitle>
            <CardDescription>
              Deel deze QR-code met klanten voor directe WhatsApp toegang
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 bg-muted/50 rounded-lg border border-border">
              {qrUrl && !imgBroken ? (
                <>
                  <div className="inline-block bg-white p-4 rounded-lg mb-4">
                    <img
                      src={`${qrUrl}?v=${cacheBust}`}
                      alt="WhatsApp QR Code"
                      className="mx-auto"
                      width={256}
                      height={256}
                      onError={() => setImgBroken(true)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={downloadQRCode}
                      variant="default" 
                      size="sm"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download QR Code
                    </Button>
                    <Button 
                      onClick={handleCopyLink}
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                    >
                      {linkCopied ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          Gekopieerd!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Kopieer WhatsApp Link
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : whatsappLink && (qrExists || imgBroken) ? (
                <>
                  <div className="inline-block bg-white p-4 rounded-lg mb-4">
                    <QRCodeSVG value={whatsappLink} size={256} />
                  </div>
                  {(needsMigration || imgBroken) && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md mb-3">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>QR code moet gerepareerd worden voor permanente versie</span>
                    </div>
                  )}
                  <Button
                    onClick={() => generateQR({ repair: true })}
                    disabled={generating}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <QrCode className="h-4 w-4" />
                    {generating ? 'Repareren...' : 'Repareer QR Code'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-64 h-64 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4">
                    <QrCode className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <Button
                    onClick={() => generateQR()}
                    disabled={generating}
                    size="sm"
                    className="gap-2"
                  >
                    <QrCode className="h-4 w-4" />
                    {generating ? 'Genereren...' : 'Genereer QR Code'}
                  </Button>
                </>
              )}
            </div>

            {/* Business Code Badge */}
            {trackingCode && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                  <span className="text-xs text-muted-foreground">Jouw business code:</span>
                  <span className="text-sm font-mono font-bold text-primary">{trackingCode}</span>
                </div>
              </div>
            )}

            {/* Platform Number */}
            <div className="text-center p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-2">Platform Nummer</p>
              <div className="text-lg font-mono font-bold text-foreground mb-3">
                {platformNumber}
              </div>
              <Button 
                onClick={handleCopyNumber}
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
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
          </CardContent>
        </Card>

        {/* Right Column: Preview & Info */}
        <div className="space-y-6">
          {/* WhatsApp Message Preview */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-500" />
                Preview: Wat klanten zien
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-[#DCF8C6] text-black p-4 rounded-lg rounded-tl-none max-w-sm shadow-md">
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  👋 Hallo {businessName}!{'\n'}
                  (Verstuur dit bericht om de chat op te slaan){'\n'}
                  Code: {trackingCode}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Dit bericht staat automatisch klaar wanneer klanten de QR-code scannen</span>
              </p>
            </CardContent>
          </Card>

          {/* How It Works - 4 Steps */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">Hoe het werkt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Klant scant QR-code</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Met hun smartphone camera of WhatsApp scanner
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">WhatsApp opent automatisch</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Met een vooringevuld welkomstbericht
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Klant verstuurt het bericht</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Door op "verzenden" te tikken activeert de chat
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">AI assistent helpt direct</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      24/7 beschikbaar voor boekingen, vragen en wijzigingen
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tips & Best Practices */}
      <Card className="bg-card border-border mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Tips voor optimaal gebruik</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span>📍</span> Waar te plaatsen
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Bij de receptie of kassa</li>
                <li>• Op visitekaartjes en folders</li>
                <li>• In bevestigingsmails</li>
                <li>• Op sociale media profielen</li>
                <li>• In de winkel vitrine</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span>💡</span> Hoe te promoten
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• "Scan voor 24/7 afspraken maken"</li>
                <li>• "Direct via WhatsApp boeken"</li>
                <li>• "WhatsApp ons voor snelle service"</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span>⚡</span> Belangrijke notities
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Klanten MOETEN het eerste bericht versturen</li>
                <li>• Anders verdwijnt de chat na sluiten WhatsApp</li>
                <li>• De code in het bericht linkt automatisch naar jouw bedrijf</li>
                <li>• QR codes zijn permanent en kunnen niet opnieuw gegenereerd worden</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Info */}
      <Card className="bg-card border-border mt-6">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Technische informatie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Elke QR code bevat een unieke tracking code gekoppeld aan jouw account</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Alle bedrijven delen hetzelfde WhatsApp nummer ({platformNumber}) voor naadloze klantervaring</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Onze AI assistent routeert gesprekken automatisch naar jouw bedrijf op basis van de tracking code</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
