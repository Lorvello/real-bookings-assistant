import React, { useState } from 'react';
import { Copy, Check, QrCode, Phone, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      toast.success('Phone number copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Could not copy phone number');
    }
  };

  const generateQRCode = () => {
    const whatsappUrl = `https://wa.me/${formattedNumber.replace('+', '')}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(whatsappUrl)}`;
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = generateQRCode();
    link.download = 'whatsapp-qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3">
          <Phone className="h-8 w-8 text-green-500" />
          <div>
            <h1 className="text-3xl font-bold text-white">Bookings Assistant</h1>
            <p className="text-gray-400 mt-1">WhatsApp booking assistant setup</p>
          </div>
        </div>
      </div>

      {/* WhatsApp Number Card */}
      <Card className="bg-slate-800/90 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-500" />
            WhatsApp Number
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Side - Number */}
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-xl p-6 text-center border border-slate-600/30">
                <div className="text-2xl font-mono font-bold text-white mb-4">
                  {whatsappNumber}
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleCopyNumber}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Number
                      </>
                    )}
                  </Button>
                  <Badge variant="outline" className="bg-slate-700/50 border-green-500/50 text-green-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    AI Assistant Active
                  </Badge>
                </div>
              </div>
            </div>

            {/* Right Side - QR Code */}
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-xl p-6 text-center border border-slate-600/30">
                <div className="inline-block bg-white p-4 rounded-lg mb-4">
                  <img
                    src={generateQRCode()}
                    alt="WhatsApp QR Code"
                    className="mx-auto rounded"
                    width={200}
                    height={200}
                  />
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Scan to open WhatsApp directly
                </p>
                <Button 
                  onClick={downloadQRCode}
                  variant="outline" 
                  className="gap-2 border-slate-600 text-gray-300 hover:bg-slate-700"
                >
                  <Download className="h-4 w-4" />
                  Download QR Code
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-slate-800/90 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h3 className="font-semibold text-white mb-2">Share with customers</h3>
              <p className="text-gray-400 text-sm">
                Provide this WhatsApp number to customers for AI-powered booking assistance.
              </p>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h3 className="font-semibold text-white mb-2">QR Code usage</h3>
              <p className="text-gray-400 text-sm">
                Place the QR code on your website, business cards, or marketing materials for easy access.
              </p>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h3 className="font-semibold text-white mb-2">Automatic booking</h3>
              <p className="text-gray-400 text-sm">
                Customers can book appointments directly through WhatsApp using the AI assistant.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}