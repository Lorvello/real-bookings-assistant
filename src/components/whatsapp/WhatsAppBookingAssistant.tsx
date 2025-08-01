import React, { useState } from 'react';
import { Copy, Check, QrCode, Phone, Download, Database, CalendarClock, Share2, MessageSquare } from 'lucide-react';
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

      {/* Prerequisites */}
      <Card className="bg-slate-800/90 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Required Setup Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h3 className="font-semibold text-white mb-2 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 mr-2 rounded-full bg-green-600/30 text-green-400 border border-green-500/30">1</span>
                Complete Business Information
              </h3>
              <p className="text-gray-400 text-sm ml-8">
                Go to Settings and fill in all required business information including your business name, address, and contact details.
              </p>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h3 className="font-semibold text-white mb-2 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 mr-2 rounded-full bg-green-600/30 text-green-400 border border-green-500/30">2</span>
                Create Service Types
              </h3>
              <p className="text-gray-400 text-sm ml-8">
                Define at least one service type with a name, duration, and price. This allows the AI assistant to understand what services you offer.
              </p>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h3 className="font-semibold text-white mb-2 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 mr-2 rounded-full bg-green-600/30 text-green-400 border border-green-500/30">3</span>
                Configure Availability
              </h3>
              <p className="text-gray-400 text-sm ml-8">
                Set your working hours and days in the Availability section. The AI assistant will only offer appointments during these times.
              </p>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h3 className="font-semibold text-white mb-2 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 mr-2 rounded-full bg-green-600/30 text-green-400 border border-green-500/30">4</span>
                Activate Subscription
              </h3>
              <p className="text-gray-400 text-sm ml-8">
                Ensure you have an active subscription that includes the WhatsApp Booking Assistant feature.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Usage Instructions */}
      <Card className="bg-slate-800/90 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* First Message Recommendation - Informational */}
            <div className="bg-slate-700/50 rounded-lg p-5 border border-slate-600/30 shadow-md">
              <h3 className="font-semibold text-white mb-2 flex items-center">
                <QrCode className="mr-2 h-5 w-5 text-blue-400" /> First Message Recommendation
              </h3>
              <div className="text-gray-300 mb-2">
                For the best experience, customers can include their name and your business name in their first message:
              </div>
              <div className="bg-slate-800/70 p-3 rounded-md border border-slate-600/50 mb-3">
                <p className="font-mono text-green-400 text-sm">
                  "Hi, ik ben [naam] en ik wil een afspraak maken bij [bedrijf]"
                </p>
              </div>
              <p className="text-gray-400 text-sm">
                This helps our system connect them to your business faster. If they don't include this information, 
                the AI assistant will simply ask which business they want to book with.
              </p>
            </div>
            
            {/* System Remembers */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h3 className="font-semibold text-white mb-2 flex items-center">
                <Database className="mr-2 h-5 w-5 text-blue-400" />
                System Remembers
              </h3>
              <p className="text-gray-400 text-sm">
                The system links their WhatsApp ID to your specific business. This connection is saved for all future conversations.
              </p>
            </div>
            
            {/* Future Bookings */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h3 className="font-semibold text-white mb-2 flex items-center">
                <CalendarClock className="mr-2 h-5 w-5 text-blue-400" />
                Future Bookings
              </h3>
              <p className="text-gray-400 text-sm">
                For future conversations, the AI assistant automatically knows which business they're booking with. No need to repeat business name.
              </p>
            </div>
            
            {/* Share with customers */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h3 className="font-semibold text-white mb-2 flex items-center">
                <Share2 className="mr-2 h-5 w-5 text-blue-400" />
                Share with customers
              </h3>
              <p className="text-gray-400 text-sm">
                Provide this WhatsApp number to customers for AI-powered booking assistance.
              </p>
            </div>
            
            {/* QR Code usage */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h3 className="font-semibold text-white mb-2 flex items-center">
                <QrCode className="mr-2 h-5 w-5 text-blue-400" />
                QR Code usage
              </h3>
              <p className="text-gray-400 text-sm">
                Place the QR code on your website, business cards, or marketing materials for easy access.
              </p>
            </div>
            
            {/* Manage conversations */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h3 className="font-semibold text-white mb-2 flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-blue-400" />
                Manage conversations
              </h3>
              <p className="text-gray-400 text-sm">
                View and manage all WhatsApp conversations in the WhatsApp tab.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}