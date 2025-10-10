import React, { useState } from 'react';
import { Copy, Check, QrCode, Phone, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';

interface WhatsAppBookingAssistantProps {
  userId: string;
}

export function WhatsAppBookingAssistant({ userId }: WhatsAppBookingAssistantProps) {
  const [copied, setCopied] = useState(false);
  
  const {
    platformNumber,
    qrUrl,
    loading,
    generating,
    qrExists,
    generateQR
  } = useWhatsAppSettings(userId);

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(platformNumber);
      setCopied(true);
      toast.success('Number copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Could not copy number');
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
    toast.success('QR code downloaded');
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
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-500" />
            WhatsApp Booking Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Platform Number */}
            <div className="space-y-4">
              <div className="text-center p-6 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-2">Platform Number</p>
                <div className="text-2xl font-mono font-bold text-foreground mb-4">
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
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Number
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right: QR Code */}
            <div className="space-y-4">
              <div className="text-center p-6 bg-muted/50 rounded-lg border border-border">
                {qrUrl ? (
                  <>
                    <div className="inline-block bg-white p-4 rounded-lg mb-4">
                      <img
                        src={qrUrl}
                        alt="WhatsApp QR Code"
                        className="mx-auto"
                        width={200}
                        height={200}
                      />
                    </div>
                    <Button 
                      onClick={downloadQRCode}
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download QR Code
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-48 h-48 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4">
                      <QrCode className="h-16 w-16 text-muted-foreground" />
                    </div>
                    <Button
                      onClick={generateQR}
                      disabled={generating || qrExists}
                      size="sm"
                      className="gap-2"
                    >
                      <QrCode className="h-4 w-4" />
                      {generating ? 'Generating...' : 'Generate QR Code'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <div className="mt-6 space-y-4">
      {/* Required Setup Steps */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">
            Required Setup Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Generate Your QR Code</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Generate QR Code" above to create your unique booking QR code. This can only be done once and cannot be changed.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Download & Display</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Download the QR code and display it in your business location, website, or marketing materials.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Customers Scan & Book</p>
                <p className="text-xs text-muted-foreground mt-1">
                  When customers scan your QR code, they'll be directed to WhatsApp with a pre-filled message that automatically links them to your business.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Each QR code contains a unique tracking code linked to your business account</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>All businesses share the same WhatsApp number ({platformNumber}) for seamless customer experience</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Our AI assistant automatically routes conversations to your business based on the tracking code</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="bg-card border-border border-amber-500/20">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="text-amber-500">⚠️</span> Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-amber-500">•</span>
              <span>QR codes are permanent and cannot be regenerated once created</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500">•</span>
              <span>Make sure to download and backup your QR code after generation</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500">•</span>
              <span>The tracking code is embedded in the QR - don't manually edit the WhatsApp link</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
