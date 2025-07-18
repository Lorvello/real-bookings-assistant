import React from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useUserStatus } from '@/contexts/UserStatusContext';

interface WhatsAppServiceStatusProps {
  calendarId: string;
}

export function WhatsAppServiceStatus({ calendarId }: WhatsAppServiceStatusProps) {
  const navigate = useNavigate();
  const { userStatus, accessControl } = useUserStatus();

  // Show status indicator if WhatsApp service is not available
  if (userStatus.isExpired || !accessControl.canAccessWhatsApp) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-foreground text-lg">
                WhatsApp Service Inactive
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {userStatus.isExpired 
                  ? "Your trial has expired. Upgrade to reactivate the WhatsApp booking assistant." 
                  : "WhatsApp booking assistant requires an active subscription."}
              </CardDescription>
            </div>
            <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
              <Lock className="h-3 w-3 mr-1" />
              Inactive
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 mb-4 border border-border/50">
            <p className="text-sm font-medium text-foreground mb-3">
              What's affected:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>• New WhatsApp bookings are disabled</li>
              <li>• Automated WhatsApp responses are paused</li>
              <li>• AI booking assistant is inactive</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">What still works:</strong> You can view existing conversations and contact history below.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/settings')}
            variant="default"
            className="w-full sm:w-auto"
          >
            Upgrade to Reactivate Service
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}