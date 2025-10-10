import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mockup, MockupFrame } from '@/components/ui/mockup';
import { toast } from 'sonner';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { supabase } from '@/integrations/supabase/client';
import QRCodeSVG from 'react-qr-code';
import { 
  Download, 
  Copy, 
  Check, 
  Clock, 
  Zap, 
  Brain, 
  Smartphone,
  QrCode,
  MessageSquare,
  Send,
  Bot,
  CalendarCheck,
  TrendingDown,
  CreditCard,
  Mail,
  Store,
  Share2,
  Eye,
  Globe,
  ArrowLeft,
  Phone,
  Video,
  MoreVertical
} from 'lucide-react';

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
      <div className="bg-card border border-border shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* SECTION 1: HERO - QR CODE SHOWCASE */}
      <div className="grid lg:grid-cols-[60%_40%] gap-8">
        {/* Left Column - QR Code Display */}
        <Card className="relative overflow-hidden bg-slate-800 border-0 shadow-lg">
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-20 blur-xl" />
          <CardContent className="relative p-8 flex flex-col items-center justify-center space-y-6">
            {/* QR Code */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-30 blur-lg rounded-3xl" />
              <div className="relative bg-white p-6 rounded-2xl shadow-xl">
                {qrUrl && !imgBroken ? (
                  <img
                    src={`${qrUrl}?v=${cacheBust}`}
                    alt="WhatsApp QR Code"
                    className="mx-auto"
                    width={280}
                    height={280}
                    onError={() => setImgBroken(true)}
                  />
                ) : whatsappLink && (qrExists || imgBroken) ? (
                  <QRCodeSVG value={whatsappLink} size={280} />
                ) : (
                  <div className="w-[280px] h-[280px] bg-slate-100 rounded-lg flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-slate-300" />
                  </div>
                )}
              </div>
            </div>

            {/* Business Code Badge */}
            <div className="flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-lg border border-slate-600">
              <span className="text-xs text-slate-400">Business Code:</span>
              <span className="font-mono font-bold text-white">{trackingCode}</span>
            </div>

            {/* Action Buttons */}
            <div className="w-full max-w-sm space-y-3">
              {qrUrl || (whatsappLink && qrExists) ? (
                <>
                  <Button 
                    onClick={downloadQRCode} 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                    size="lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download QR Code
                  </Button>
                  <Button 
                    onClick={handleCopyLink}
                    variant="secondary"
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                    size="lg"
                  >
                    {linkCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {linkCopied ? 'Copied!' : 'Copy WhatsApp Link'}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => generateQR()} 
                  disabled={generating}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                  size="lg"
                >
                  {generating ? 'Generating...' : 'Generate QR Code'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Quick Info */}
        <div className="space-y-6">
          {/* Phone Number Card */}
          <Card className="bg-slate-800 border-slate-700 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                Your WhatsApp Booking Line
              </p>
              <div className="flex items-center justify-between">
                <div className="font-mono text-2xl font-bold text-white">
                  {platformNumber}
                </div>
                <Button
                  onClick={handleCopyNumber}
                  variant="ghost"
                  size="icon"
                  className="hover:bg-slate-700"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </Button>
              </div>
              <div className="h-px bg-gradient-to-r from-emerald-500/50 to-cyan-500/50" />
              
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-700/50 border border-slate-600 p-3 rounded-lg">
                  <Clock className="w-5 h-5 text-emerald-400 mb-1" />
                  <p className="text-xs text-slate-300 font-medium">24/7 Available</p>
                </div>
                <div className="bg-slate-700/50 border border-slate-600 p-3 rounded-lg">
                  <Zap className="w-5 h-5 text-cyan-400 mb-1" />
                  <p className="text-xs text-slate-300 font-medium">Instant Response</p>
                </div>
                <div className="bg-slate-700/50 border border-slate-600 p-3 rounded-lg">
                  <Brain className="w-5 h-5 text-emerald-400 mb-1" />
                  <p className="text-xs text-slate-300 font-medium">AI Powered</p>
                </div>
                <div className="bg-slate-700/50 border border-slate-600 p-3 rounded-lg">
                  <Smartphone className="w-5 h-5 text-cyan-400 mb-1" />
                  <p className="text-xs text-slate-300 font-medium">No App Needed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 2: WHATSAPP PREVIEW - MAKE IT REAL */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white text-center mb-8">
          What Your Customers See
        </h2>
        <div className="flex justify-center">
          <Mockup type="mobile" className="bg-slate-800">
            <div className="w-[350px] h-[600px] bg-white flex flex-col">
              {/* WhatsApp Header */}
              <div className="bg-emerald-600 px-4 py-3 flex items-center gap-3 shadow-md">
                <ArrowLeft className="w-5 h-5 text-white" />
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">Bookings Assistant</p>
                  <p className="text-emerald-100 text-xs">online</p>
                </div>
                <Phone className="w-5 h-5 text-white" />
                <Video className="w-5 h-5 text-white" />
                <MoreVertical className="w-5 h-5 text-white" />
              </div>

              {/* Chat Area */}
              <div className="flex-1 bg-[#e5ddd5] p-4 overflow-y-auto space-y-3" style={{
                backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h100v100H0z\" fill=\"%23e5ddd5\"/%3E%3Cpath d=\"M50 0L100 50 50 100 0 50z\" fill=\"%23d9d1c9\" opacity=\".05\"/%3E%3C/svg%3E')"
              }}>
                {/* Customer Message */}
                <div className="flex justify-end">
                  <div className="bg-white max-w-[80%] rounded-lg rounded-tr-none shadow-sm px-3 py-2">
                    <p className="text-sm text-slate-900 whitespace-pre-line">
                      Hello {businessName}!{'\n\n'}(Send this message to save the chat, then you can always book via WhatsApp.)
                    </p>
                    <p className="text-[10px] text-slate-500 text-right mt-1">14:23 ✓✓</p>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex justify-start">
                  <div className="bg-emerald-500 max-w-[80%] rounded-lg rounded-tl-none shadow-sm px-3 py-2">
                    <p className="text-sm text-white">
                      Hi! Welcome to {businessName}! 👋{'\n\n'}I'm here to help you book an appointment. When would you like to come in?
                    </p>
                    <p className="text-[10px] text-emerald-100 text-right mt-1">14:23</p>
                  </div>
                </div>

                {/* Typing Indicator */}
                <div className="flex justify-start">
                  <div className="bg-white rounded-lg rounded-tl-none shadow-sm px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Input Bar */}
              <div className="bg-slate-100 px-2 py-2 flex items-center gap-2 border-t border-slate-200">
                <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-slate-500">
                  Type a message...
                </div>
                <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </Mockup>
        </div>
      </div>

      {/* SECTION 3: HOW IT WORKS - VISUAL FLOW */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white text-center mb-8">
          How It Works
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <Card className="relative bg-slate-800 border-slate-700 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Scan QR Code</h3>
                <p className="text-sm text-slate-400">Customer scans with phone camera</p>
              </div>
            </CardContent>
            <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-slate-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </Card>

          {/* Step 2 */}
          <Card className="relative bg-slate-800 border-slate-700 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">WhatsApp Opens</h3>
                <p className="text-sm text-slate-400">Pre-filled message appears</p>
              </div>
            </CardContent>
            <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-slate-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </Card>

          {/* Step 3 */}
          <Card className="relative bg-slate-800 border-slate-700 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <Send className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Send Message</h3>
                <p className="text-sm text-slate-400">Customer taps send to start</p>
              </div>
            </CardContent>
            <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-slate-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </Card>

          {/* Step 4 */}
          <Card className="bg-slate-800 border-slate-700 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Instant Reply</h3>
                <p className="text-sm text-slate-400">AI assistant takes over</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 4: KEY BENEFITS - IMPACT CARDS */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white text-center mb-8">
          Why Businesses Love It
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Benefit 1 */}
          <Card className="relative overflow-hidden bg-slate-800 border-0 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
            <CardContent className="relative p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <CalendarCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                24/7
              </div>
              <p className="text-sm text-slate-300">
                AI assistant works around the clock, even when you sleep
              </p>
            </CardContent>
          </Card>

          {/* Benefit 2 */}
          <Card className="relative overflow-hidden bg-slate-800 border-0 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent" />
            <CardContent className="relative p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Zap className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                &lt;2s
              </div>
              <p className="text-sm text-slate-300">
                Customers get immediate answers, no waiting
              </p>
            </CardContent>
          </Card>

          {/* Benefit 3 */}
          <Card className="relative overflow-hidden bg-slate-800 border-0 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
            <CardContent className="relative p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <TrendingDown className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                -40%
              </div>
              <p className="text-sm text-slate-300">
                Automated reminders keep customers engaged
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 5: SHARE OPTIONS - ACTIONABLE */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white text-center mb-8">
          Where To Share Your QR Code
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: CreditCard, label: 'On Business Cards' },
            { icon: Mail, label: 'In Confirmation Emails' },
            { icon: Store, label: 'At Reception Desk' },
            { icon: Share2, label: 'On Social Media' },
            { icon: Eye, label: 'In Window Display' },
            { icon: Globe, label: 'On Your Website' },
          ].map(({ icon: Icon, label }) => (
            <Card 
              key={label}
              className="bg-slate-800 border-slate-700 shadow-lg hover:border-emerald-500/50 hover:shadow-emerald-500/10 transition-all duration-200 cursor-pointer group"
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-700/50 border border-slate-600 flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-colors">
                  <Icon className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                </div>
                <p className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                  {label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
