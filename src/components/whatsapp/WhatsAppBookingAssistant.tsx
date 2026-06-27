import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { WhatsAppWelcomeMessage } from '@/components/whatsapp/WhatsAppWelcomeMessage';
import { supabase } from '@/integrations/supabase/client';
import QRCodeSVG from 'react-qr-code';
import { Download, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WhatsAppBookingAssistantProps {
  userId: string;
}

export function WhatsAppBookingAssistant({ userId }: WhatsAppBookingAssistantProps) {
  const { t } = useTranslation('appPages');
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);
  const [businessName, setBusinessName] = useState('');
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

      // Natural generic greeting until the business name is set, instead of the
      // awkward "Hello Our business!".
      setBusinessName(data?.business_name || 'there');
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
      toast.success(t('waPage.number.copiedToast', 'Number copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(t('waPage.number.copyFailed', 'Failed to copy number'));
    }
  };

  const handleCopyLink = async () => {
    if (!whatsappLink) return;
    
    try {
      await navigator.clipboard.writeText(whatsappLink);
      setLinkCopied(true);
      toast.success(t('waPage.link.copiedToast', 'WhatsApp link copied'));
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast.error(t('waPage.link.copyFailed', 'Failed to copy link'));
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
    toast.success(t('waPage.qr.downloadedToast', 'QR code downloaded'));
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <Card className="bg-card rounded-xl">
          <CardContent className="p-6 sm:p-12">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-sm text-muted-foreground">{t('waPage.loading', 'Loading...')}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Main Grid: 70/30 split */}
      <div className="grid lg:grid-cols-[70%_30%] gap-6">
        
        {/* LEFT: QR Code Hero */}
        <Card className="relative overflow-hidden bg-card rounded-2xl border border-white/[0.08]">
          <CardContent className="relative p-6 sm:p-12 flex flex-col items-center space-y-6">
            {/* QR Code Display - 400x400 */}
            <div className="bg-white p-4 sm:p-8 rounded-xl">
              {qrUrl && !imgBroken ? (
                <img
                  src={`${qrUrl}?v=${cacheBust}`}
                  alt="WhatsApp QR Code"
                  width={400}
                  height={400}
                  className="w-full h-auto max-w-[400px]"
                  onError={() => setImgBroken(true)}
                />
              ) : whatsappLink && (qrExists || imgBroken) ? (
                <QRCodeSVG value={whatsappLink} size={400} className="w-full h-auto max-w-[400px]" />
              ) : (
                <div className="w-full max-w-[400px] aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">{t('waPage.qr.placeholder', 'QR code will appear here')}</span>
                </div>
              )}
            </div>


            {/* Primary Action Buttons */}
            <div className="w-full max-w-md space-y-3">
              {qrUrl || (whatsappLink && qrExists) ? (
                <>
                  <Button
                    onClick={downloadQRCode}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    size="lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t('waPage.qr.download', 'Download QR Code')}
                  </Button>
                  <Button
                    onClick={() => generateQR()}
                    disabled={generating}
                    variant="outline"
                    className="w-full border-white/[0.08] text-foreground hover:bg-white/[0.06]"
                    size="lg"
                  >
                    {generating ? t('waPage.qr.regenerating', 'Regenerating...') : t('waPage.qr.regenerate', 'Regenerate QR Code')}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => generateQR()}
                  disabled={generating}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  {generating ? t('waPage.qr.generating', 'Generating...') : t('waPage.qr.generate', 'Generate QR Code')}
                </Button>
              )}
            </div>

            {/* Secondary Action - Text Link */}
            {(qrUrl || (whatsappLink && qrExists)) && (
              <button
                onClick={handleCopyLink}
                className="rounded px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                {linkCopied ? t('waPage.link.copied', 'Link copied!') : t('waPage.link.copy', 'Copy WhatsApp Link')}
              </button>
            )}
          </CardContent>
        </Card>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-6">
          
          {/* Quick Info Card */}
          <Card className="bg-card rounded-xl border border-white/[0.08]">
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">{t('waPage.number.label', 'Your WhatsApp Line')}</p>

              <div className="flex items-center justify-between">
                <div className="font-mono text-2xl text-foreground tabular-nums">
                  {platformNumber}
                </div>
                <Button
                  onClick={handleCopyNumber}
                  variant="ghost"
                  size="icon"
                  aria-label={copied ? t('waPage.number.copiedAriaLabel', 'Number copied') : t('waPage.number.copyAriaLabel', 'Copy WhatsApp number')}
                  className="shrink-0 min-w-11 md:min-w-0 hover:bg-white/[0.06]"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-accent-foreground" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>

            </CardContent>
          </Card>

          {/* Message Preview Card */}
          <Card className="bg-card rounded-xl border border-white/[0.08]">
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">{t('waPage.preview.label', 'Customer Message')}</p>

              <div className="bg-background p-4 rounded-lg border border-white/[0.08]">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {t('waPage.preview.message', 'Hello {{businessName}}!\n(Send this message to save the chat, then you can always book via WhatsApp.)', { businessName })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* BOTTOM SECTION - Full Width */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        
        {/* How It Works — now explains the recognition + the first-message rule so
            the owner understands why the first reply is a greeting, and how to test
            the assistant as a customer would. */}
        <Card className="bg-card rounded-lg border border-white/[0.08]">
          <CardContent className="p-6">
            <h3 className="text-base text-foreground font-medium mb-4">{t('waPage.howItWorks.title', 'How It Works')}</h3>

            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>{t('waPage.howItWorks.step1', '1. A customer scans your QR code (or taps your link).')}</p>
              <p>{t('waPage.howItWorks.step2', '2. WhatsApp opens with a pre-filled message that quietly carries your business code, so we know the chat belongs to you.')}</p>
              <p>{t('waPage.howItWorks.step3', '3. They send it once to save the chat. The assistant replies with a short welcome.')}</p>
              <p>{t('waPage.howItWorks.step4', '4. From then on, the assistant answers their questions and books, reschedules or cancels for them.')}</p>
            </div>

            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/[0.06] px-4 py-3">
              <p className="text-sm font-medium text-foreground">{t('waPage.howItWorks.testTitle', 'Want to test it yourself?')}</p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {t('waPage.howItWorks.testDesc', 'Scan your own QR and send the pre-filled message. The first reply is always the welcome. Then send your real question (for example "can I book tomorrow at 2pm?") and the assistant will help you, exactly like a customer. Tip: you can also put your question straight after the saved message, the assistant greets and helps in one go.')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Where To Share */}
        <Card className="bg-card rounded-lg border border-white/[0.08]">
          <CardContent className="p-6">
            <h3 className="text-base text-foreground font-medium mb-4">{t('waPage.shareQr.title', 'Where To Share Your QR Code')}</h3>

            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <li>{t('waPage.shareQr.item1', '• On business cards and flyers')}</li>
              <li>{t('waPage.shareQr.item2', '• At reception or checkout desk')}</li>
              <li>{t('waPage.shareQr.item3', '• In confirmation emails')}</li>
              <li>{t('waPage.shareQr.item4', '• On your website')}</li>
              <li>{t('waPage.shareQr.item5', '• On social media profiles')}</li>
              <li>{t('waPage.shareQr.item6', '• In window displays')}</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Customizable first-reply greeting */}
      <WhatsAppWelcomeMessage userId={userId} />
    </div>
  );
}
