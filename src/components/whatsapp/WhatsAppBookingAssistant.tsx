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
  );
}
