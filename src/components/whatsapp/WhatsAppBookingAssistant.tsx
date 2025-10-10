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
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: QR Code */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              QR Code
            </CardTitle>
            <CardDescription>
              Download or share this code for instant WhatsApp access
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
                  {(needsMigration || imgBroken) && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md mb-3">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>QR code requires repair for permanent version</span>
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
                    {generating ? 'Repairing...' : 'Repair QR Code'}
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
                    {generating ? 'Generating...' : 'Generate QR Code'}
                  </Button>
                </>
              )}
            </div>


            {/* Platform Number */}
            <div className="text-center p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-2">Platform Number</p>
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
        <div className="space-y-6">
          {/* WhatsApp Message Preview */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Customer Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-[#DCF8C6] text-black p-4 rounded-lg rounded-tl-none max-w-sm shadow-md">
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  👋 Hello {businessName}!{'\n'}
                  (Send this message to save the chat, then you can always book via WhatsApp.)
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>This message is pre-filled when customers scan the QR code</span>
              </p>
            </CardContent>
          </Card>

          {/* How It Works - 4 Steps */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Customer scans QR code</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      With their smartphone camera or WhatsApp scanner
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">WhatsApp opens automatically</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      With a pre-filled welcome message
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Customer sends the message</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      By tapping "send" to activate the chat
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">AI assistant responds instantly</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available 24/7 for bookings, questions, and changes
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Customer Action Required */}
          <Card className="bg-card border-border shadow-sm border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Customer Action Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Customers must send the first message to save the conversation. If they close WhatsApp without sending, the chat will be lost.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Best Practices */}
      <Card className="bg-card border-border mt-6 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <h4 className="text-sm font-medium mb-2">Where to Display</h4>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>At reception or checkout</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>On business cards and flyers</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>In confirmation emails</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>On social media profiles</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>In storefront windows</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
