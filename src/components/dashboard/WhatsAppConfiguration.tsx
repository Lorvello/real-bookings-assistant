
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WhatsAppStatus } from '@/types/calendar';

interface WhatsAppConfigurationProps {
  whatsappStatus: WhatsAppStatus;
}

export function WhatsAppConfiguration({ whatsappStatus }: WhatsAppConfigurationProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground">WhatsApp Configuration</CardTitle>
        <CardDescription>
          Connect and configure your WhatsApp Business account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-whatsapp/20 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-whatsapp" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">WhatsApp Business</h3>
              <p className="text-sm text-muted-foreground">
                {whatsappStatus.isConnected ? 'Connected and active' : 'Not connected'}
              </p>
            </div>
          </div>
          <Badge variant={whatsappStatus.isConnected ? "default" : "destructive"}>
            {whatsappStatus.isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        
        {!whatsappStatus.isConnected && (
          <Button className="w-full bg-whatsapp hover:bg-whatsapp/90 text-white">
            Connect WhatsApp Business
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
