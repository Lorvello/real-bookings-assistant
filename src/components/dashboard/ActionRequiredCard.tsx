
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, Clock, Target, Mail } from 'lucide-react';
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
  const { setupProgress } = useProfile(user);
  const { isConnected: calendarConnected } = useCalendarLinking(user);

  const actionItems = [];

  // Check email verification
  if (user && !user.email_confirmed_at) {
    actionItems.push({
      id: 'email_verification',
      title: 'Verify Email Address',
      description: 'Check your email and click the verification link',
      icon: Mail,
      severity: 'high',
      action: () => {
        // Could trigger resend verification email
      }
    });
  }

  // Check calendar connection
  if (!calendarConnected && !setupProgress?.calendar_linked) {
    actionItems.push({
      id: 'calendar_connection',
      title: 'Connect Calendar',
      description: 'Link your calendar to start receiving bookings',
      icon: Calendar,
      severity: 'high',
      action: onCalendarModalOpen
    });
  }

  // Check availability configuration
  if (!setupProgress?.availability_configured) {
    actionItems.push({
      id: 'availability_setup',
      title: 'Configure Availability',
      description: 'Set your working hours and time slots',
      icon: Clock,
      severity: 'medium',
      action: () => {
        // Navigate to availability settings
      }
    });
  }

  // Check booking rules
  if (!setupProgress?.booking_rules_set) {
    actionItems.push({
      id: 'booking_rules',
      title: 'Set Booking Rules',
      description: 'Define your booking policies and requirements',
      icon: Target,
      severity: 'medium',
      action: () => {
        // Navigate to booking rules
      }
    });
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (actionItems.length === 0) {
    return null;
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-red-900">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Action Required
          <Badge className="bg-red-100 text-red-800 border-red-200" variant="outline">
            {actionItems.length} items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-red-200"
            >
              <div className="p-2 rounded-full bg-red-100">
                <IconComponent className="h-5 w-5 text-red-600" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-red-900">{item.title}</h4>
                  <Badge 
                    className={getSeverityColor(item.severity)} 
                    variant="outline"
                  >
                    {item.severity}
                  </Badge>
                </div>
                <p className="text-sm text-red-700">{item.description}</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={item.action}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                Fix Now
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
