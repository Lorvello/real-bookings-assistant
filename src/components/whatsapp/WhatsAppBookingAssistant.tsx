import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  // Also bust cache when the underlying link (message) changes
  useEffect(() => {
    if (whatsappLink) setCacheBust(Date.now());
  }, [whatsappLink]);

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(platformNumber);
      setCopied(true);
      toast.success('Number copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy number');
    }
  };

  const handleCopyLink = async () => {
    if (!whatsappLink) return;
    
    try {
      await navigator.clipboard.writeText(whatsappLink);
      setLinkCopied(true);
      toast.success('WhatsApp link copied');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-muted-foreground/50 font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 gap-10">
        {/* Left Column: QR Code */}
        <Card className="bg-card border border-border/40 rounded-xl hover:border-border/60 transition-colors">
          <CardHeader className="pb-6">
            <CardTitle className="text-base font-semibold tracking-tight">
              QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="text-center p-8 bg-muted/30 rounded-lg border border-border/20">
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
                    <Button onClick={downloadQRCode} variant="default" size="sm">Download QR Code</Button>
                    <Button onClick={handleCopyLink} variant="outline" size="sm">
                      {linkCopied ? 'Copied!' : 'Copy WhatsApp Link'}
                    </Button>
                  </div>
                </>
              ) : whatsappLink && (qrExists || imgBroken) ? (
                <>
                  <div className="inline-block bg-white p-4 rounded-lg mb-4">
                    <QRCodeSVG value={whatsappLink} size={256} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={downloadQRCode} variant="default" size="sm">Download QR Code</Button>
                    <Button onClick={handleCopyLink} variant="outline" size="sm">
                      {linkCopied ? 'Copied!' : 'Copy WhatsApp Link'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-64 h-64 mx-auto bg-muted/30 rounded-lg border border-border/20 flex items-center justify-center mb-4">
                    <span className="text-xs text-muted-foreground">QR code will appear here</span>
                  </div>
                  <Button onClick={() => generateQR()} disabled={generating} variant="default" size="sm">
                    {generating ? 'Generating...' : 'Generate QR Code'}
                  </Button>
                </>
              )}
            </div>


            {/* Platform Number */}
            <div className="text-center p-6 bg-muted/30 rounded-lg border border-border/20">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60 mb-4">Platform Number</p>
              <div className="text-lg font-mono font-bold text-foreground mb-4">
                {platformNumber}
              </div>
              <Button 
                onClick={handleCopyNumber}
                variant="outline" 
                size="sm"
              >
                {copied ? 'Copied!' : 'Copy Number'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Preview & Info */}
        <div className="space-y-10">
          {/* WhatsApp Message Preview */}
          <Card className="bg-card border border-border/40 rounded-xl hover:border-border/60 transition-colors">
            <CardHeader className="pb-6">
              <CardTitle className="text-base font-semibold tracking-tight">
                Customer Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted text-foreground p-4 rounded-lg max-w-sm border border-border/20">
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  Hello {businessName}!{'\n'}
                  (Send this message to save the chat, then you can always book via WhatsApp.)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How It Works - 4 Steps */}
          <Card className="bg-card border border-border/40 rounded-xl hover:border-border/60 transition-colors">
            <CardHeader className="pb-6">
              <CardTitle className="text-base font-semibold tracking-tight">How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="text-muted-foreground/60 font-mono text-sm font-medium min-w-[24px]">
                    01
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">Customer scans QR code</h4>
                    <p className="text-xs text-muted-foreground/70 leading-relaxed">
                      With their smartphone camera or WhatsApp scanner
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="text-muted-foreground/60 font-mono text-sm font-medium min-w-[24px]">
                    02
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">WhatsApp opens automatically</h4>
                    <p className="text-xs text-muted-foreground/70 leading-relaxed">
                      With a pre-filled welcome message
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="text-muted-foreground/60 font-mono text-sm font-medium min-w-[24px]">
                    03
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">Customer sends the message</h4>
                    <p className="text-xs text-muted-foreground/70 leading-relaxed">
                      By tapping "send" to activate the chat
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="text-muted-foreground/60 font-mono text-sm font-medium min-w-[24px]">
                    04
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">AI assistant responds instantly</h4>
                    <p className="text-xs text-muted-foreground/70 leading-relaxed">
                      Available 24/7 for bookings, questions, and changes
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Best Practices */}
      <Card className="bg-card border border-border/40 rounded-xl hover:border-border/60 transition-colors mt-10">
        <CardHeader className="pb-6">
          <CardTitle className="text-base font-semibold tracking-tight">Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y divide-border/20">
            <div className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm text-foreground/90">At reception or checkout</p>
            </div>
            <div className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm text-foreground/90">On business cards and flyers</p>
            </div>
            <div className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm text-foreground/90">In confirmation emails</p>
            </div>
            <div className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm text-foreground/90">On social media profiles</p>
            </div>
            <div className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm text-foreground/90">In storefront windows</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
