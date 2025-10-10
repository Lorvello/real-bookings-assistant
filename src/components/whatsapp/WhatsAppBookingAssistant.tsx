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
      <div className="flex items-center justify-center p-12">
        <div className="text-sm text-muted-foreground/60">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column: QR Code */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              QR Code
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80">
              Download or share to enable WhatsApp bookings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-8 bg-card/40 backdrop-blur-sm rounded-xl border border-border/40">
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
                      className="gap-2 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <Download className="h-4 w-4" />
                      Download QR Code
                    </Button>
                    <Button 
                      onClick={handleCopyLink}
                      variant="outline" 
                      size="sm"
                      className="gap-2 border-border/60 hover:border-border hover:bg-card/60 transition-all duration-200"
                    >
                      {linkCopied ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy WhatsApp Link
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
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={downloadQRCode}
                      variant="default" 
                      size="sm"
                      className="gap-2 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <Download className="h-4 w-4" />
                      Download QR Code
                    </Button>
                    <Button 
                      onClick={handleCopyLink}
                      variant="outline" 
                      size="sm"
                      className="gap-2 border-border/60 hover:border-border hover:bg-card/60 transition-all duration-200"
                    >
                      {linkCopied ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy WhatsApp Link
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-64 h-64 mx-auto bg-card/40 backdrop-blur-sm rounded-xl border border-border/40 flex items-center justify-center mb-4">
                    <QrCode className="h-16 w-16 text-muted-foreground/40" />
                  </div>
                  <Button
                    onClick={() => generateQR()}
                    disabled={generating}
                    size="sm"
                    className="gap-2 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <QrCode className="h-4 w-4" />
                    {generating ? 'Generating...' : 'Generate QR Code'}
                  </Button>
                </>
              )}
            </div>


            {/* Platform Number */}
            <div className="text-center p-6 bg-card/40 backdrop-blur-sm rounded-xl border border-border/40">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Platform Number</p>
              <div className="text-lg font-mono font-bold text-foreground mb-4">
                {platformNumber}
              </div>
              <Button 
                onClick={handleCopyNumber}
                variant="outline" 
                size="sm"
                className="gap-2 border-border/60 hover:border-border hover:bg-card/60 transition-all duration-200"
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
          </CardContent>
        </Card>

        {/* Right Column: Preview & Info */}
        <div className="space-y-8">
          {/* WhatsApp Message Preview */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Customer Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#DCF8C6] text-black p-4 rounded-lg rounded-tl-none max-w-sm shadow-md border border-black/5">
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  👋 Hello {businessName}!{'\n'}
                  (Send this message to save the chat, then you can always book via WhatsApp.)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How It Works - 4 Steps */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold">How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shadow-sm flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground mb-1">Customer scans QR code</h4>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                      With their smartphone camera or WhatsApp scanner
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shadow-sm flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground mb-1">WhatsApp opens automatically</h4>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                      With a pre-filled welcome message
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shadow-sm flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground mb-1">Customer sends the message</h4>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                      By tapping "send" to activate the chat
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shadow-sm flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground mb-1">AI assistant responds instantly</h4>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
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
      <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-all duration-200 mt-8">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">Where to Display</h4>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5 text-lg leading-none">•</span>
                <span className="text-sm text-muted-foreground/90 leading-relaxed">At reception or checkout</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5 text-lg leading-none">•</span>
                <span className="text-sm text-muted-foreground/90 leading-relaxed">On business cards and flyers</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5 text-lg leading-none">•</span>
                <span className="text-sm text-muted-foreground/90 leading-relaxed">In confirmation emails</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5 text-lg leading-none">•</span>
                <span className="text-sm text-muted-foreground/90 leading-relaxed">On social media profiles</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5 text-lg leading-none">•</span>
                <span className="text-sm text-muted-foreground/90 leading-relaxed">In storefront windows</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
