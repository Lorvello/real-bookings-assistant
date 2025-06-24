
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, Phone, Settings } from 'lucide-react';

export interface WhatsAppTabProps {
  whatsappSettings?: any;
  setWhatsappSettings?: (settings: any) => void;
}

export const WhatsAppTab: React.FC<WhatsAppTabProps> = ({ 
  whatsappSettings = {}, 
  setWhatsappSettings = () => {} 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [botActive, setBotActive] = useState(false);

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

          <div className="space-y-4">
            <div>
              <Label htmlFor="phone" className="text-white">Telefoonnummer</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+31 6 12345678"
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>

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
