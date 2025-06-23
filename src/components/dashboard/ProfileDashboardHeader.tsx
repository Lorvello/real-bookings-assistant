
import React from 'react';
import { Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WhatsAppStatus } from '@/types/calendar';

interface ProfileDashboardHeaderProps {
  profileName?: string;
  whatsappStatus: WhatsAppStatus;
}

export function ProfileDashboardHeader({ profileName, whatsappStatus }: ProfileDashboardHeaderProps) {
  return (
    <Card className="mb-8 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-3xl font-bold text-foreground">
              Welcome back{profileName ? `, ${profileName}` : ''}!
            </CardTitle>
            <CardDescription className="mt-1 text-muted-foreground">
              Beheer je WhatsApp Booking Assistant
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${whatsappStatus.isConnected ? 'bg-whatsapp animate-pulse' : 'bg-destructive'}`}></div>
              <span className={`text-sm font-medium ${whatsappStatus.isConnected ? 'text-whatsapp' : 'text-destructive'}`}>
                {whatsappStatus.isConnected ? 'WhatsApp Actief' : 'WhatsApp Offline'}
              </span>
            </div>
            {whatsappStatus.phoneNumber && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {whatsappStatus.phoneNumber}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
