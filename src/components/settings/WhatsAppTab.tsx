import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, Phone, QrCode, Loader2 } from 'lucide-react';
import { QRCodeDisplay } from '@/components/profile/QRCodeDisplay';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppTabProps {
  calendarId?: string;
  whatsappSettings?: any;
  setWhatsappSettings?: (settings: any) => void;
}

export const WhatsAppTab: React.FC<WhatsAppTabProps> = ({ 
  calendarId,
  whatsappSettings = {}, 
  setWhatsappSettings = () => {} 
}) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [botActive, setBotActive] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);

  useEffect(() => {
    if (calendarId) {
      loadQrCode();
    }
  }, [calendarId]);

  const loadQrCode = async () => {
    if (!calendarId) return;

    const { data, error } = await supabase
      .from('calendar_settings')
      .select('whatsapp_qr_url')
      .eq('calendar_id', calendarId)
      .single();

    if (data?.whatsapp_qr_url) {
      setQrUrl(data.whatsapp_qr_url);
    }
  };

  const handleGenerateQr = async () => {
    if (!phoneNumber || !calendarId) {
      toast({
        title: 'Fout',
        description: 'Voer eerst een WhatsApp telefoonnummer in',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingQr(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-whatsapp-qr', {
        body: { calendarId, phoneNumber }
      });

      if (error) throw error;

      setQrUrl(data.qrUrl);
      toast({
        title: 'Succes',
        description: 'WhatsApp QR-code is gegenereerd'
      });
    } catch (error: any) {
      console.error('QR generation error:', error);
      toast({
        title: 'Fout',
        description: error.message || 'Kon QR-code niet genereren',
        variant: 'destructive'
      });
    } finally {
      setGeneratingQr(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <MessageSquare className="h-6 w-6 text-green-500" />
          <div>
            <h2 className="text-xl font-semibold text-white">WhatsApp Integratie</h2>
            <p className="text-gray-400 text-sm">Verbind je WhatsApp account voor automatische boekingen</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-white font-medium">
                {isConnected ? 'Verbonden' : 'Niet verbonden'}
              </span>
            </div>
            <Button variant="outline" size="sm">
              {isConnected ? 'Ontkoppelen' : 'Verbinden'}
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="phone" className="text-white">Telefoonnummer</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+31 6 12345678"
                  className="bg-slate-700/50 border-slate-600 text-white flex-1"
                />
                <Button
                  onClick={handleGenerateQr}
                  disabled={generatingQr || !phoneNumber}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {generatingQr ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Genereren...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      QR Genereren
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Formaat: +31 6 12345678 (met landcode)
              </p>
            </div>

            {qrUrl && (
              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Jouw WhatsApp QR-Code
                </h3>
                <QRCodeDisplay data={qrUrl} size={200} />
                <p className="text-xs text-gray-400 mt-2">
                  Klanten kunnen deze QR-code scannen om direct een WhatsApp gesprek met je te starten
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">WhatsApp Bot</Label>
                <p className="text-sm text-gray-400">Automatische reacties en boekingen</p>
              </div>
              <Switch
                checked={botActive}
                onCheckedChange={setBotActive}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
