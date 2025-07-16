import React from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useUserStatus } from '@/hooks/useUserStatus';

interface WhatsAppServiceStatusProps {
  calendarId: string;
}

export function WhatsAppServiceStatus({ calendarId }: WhatsAppServiceStatusProps) {
  const navigate = useNavigate();
  const { userStatus, accessControl } = useUserStatus();

  // Show status indicator if WhatsApp service is not available
  if (userStatus.isExpired || !accessControl.canAccessWhatsApp) {
    return (
      <Card className="border-orange-200 bg-orange-50/50 mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-orange-900 text-lg">
                WhatsApp Service Inactive
              </CardTitle>
              <CardDescription className="text-orange-700">
                {userStatus.isExpired 
                  ? "Your trial has expired. Upgrade to reactivate the WhatsApp booking assistant." 
                  : "WhatsApp booking assistant requires an active subscription."}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              <Lock className="h-3 w-3 mr-1" />
              Inactive
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-orange-100/50 rounded-lg p-4 mb-4">
            <p className="text-sm text-orange-800 mb-3">
              <strong>What's affected:</strong>
            </p>
            <ul className="text-sm text-orange-700 space-y-1 mb-4">
              <li>• New WhatsApp bookings are disabled</li>
              <li>• Automated WhatsApp responses are paused</li>
              <li>• AI booking assistant is inactive</li>
            </ul>
            <p className="text-sm text-orange-700">
              <strong>What still works:</strong> You can view existing conversations and contact history below.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/settings')}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Upgrade to Reactivate Service
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}