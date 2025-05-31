
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Calendar, CheckCircle, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarLinking } from '@/hooks/useCalendarLinking';

interface ActionRequiredCardProps {
  onCalendarModalOpen: () => void;
}

export const ActionRequiredCard: React.FC<ActionRequiredCardProps> = ({
  onCalendarModalOpen
}) => {
  const { user } = useAuth();
  const { setupProgress, loading } = useProfile(user);
  const { isConnected: calendarConnected, loading: calendarLoading } = useCalendarLinking(user);

  if (loading || calendarLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Action Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const needsCalendarLink = !calendarConnected && !setupProgress?.calendar_linked;
  const needsAvailability = !setupProgress?.availability_configured;
  const needsBookingRules = !setupProgress?.booking_rules_set;

  const actionItems = [];
  
  if (needsCalendarLink) {
    actionItems.push({
      title: 'Link Your Calendar',
      description: 'Connect your Google Calendar to enable bookings',
      action: 'connect-calendar'
    });
  }
  
  if (needsAvailability) {
    actionItems.push({
      title: 'Set Availability',
      description: 'Configure your working hours',
      action: 'set-availability'
    });
  }
  
  if (needsBookingRules) {
    actionItems.push({
      title: 'Configure Booking Rules',
      description: 'Set up your booking policies',
      action: 'set-rules'
    });
  }

  if (actionItems.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Setup Complete
            </span>
            <Badge variant="outline" className="text-green-700 border-green-300">
              Ready
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your booking system is fully configured and ready to receive appointments via WhatsApp!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Action Required
          </span>
          <Badge variant="outline" className="text-amber-700 border-amber-300">
            {actionItems.length} item{actionItems.length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              Complete these steps to activate your 24/7 WhatsApp booking system.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {actionItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-gray-600">{item.description}</div>
                  </div>
                </div>
                
                {item.action === 'connect-calendar' && (
                  <Button onClick={onCalendarModalOpen} size="sm">
                    Connect
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
