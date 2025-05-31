
/**
 * 🚀 SETUP PROGRESS TRACKING CARD - Enhanced with Prominent Nuclear Disconnect
 * ===========================================================================
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, Target, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarLinking } from '@/hooks/useCalendarLinking';
import { useToast } from '@/hooks/use-toast';
import { SetupProgressIndicator } from './SetupProgressIndicator';
import { SetupStepItem } from './SetupStepItem';
import { NuclearDisconnectButton } from '@/components/calendar/NuclearDisconnectButton';
import { disconnectAllCalendarConnections } from '@/utils/calendar/connectionDisconnect';

interface SetupProgressCardProps {
  onCalendarModalOpen: () => void;
}

export const SetupProgressCard: React.FC<SetupProgressCardProps> = ({
  onCalendarModalOpen
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { setupProgress, updateSetupProgress: updateProfileSetupProgress, loading } = useProfile(user);
  const { isConnected: calendarConnected, loading: calendarLoading, refetchConnection } = useCalendarLinking(user);

  const handleStepAction = async (step: string, completed: boolean) => {
    if (!user) {
      console.error('[SetupProgress] No user available for step action');
      return;
    }

    switch (step) {
      case 'calendar_linked':
        if (!completed) {
          console.log('[SetupProgress] Opening calendar modal');
          onCalendarModalOpen();
        } else {
          console.log('[SetupProgress] Resetting calendar - disconnecting all connections');
          
          try {
            const success = await disconnectAllCalendarConnections(user);
            
            if (success) {
              toast({
                title: "Kalender Reset",
                description: "Alle kalender verbindingen zijn succesvol ontkoppeld",
              });
              
              setTimeout(async () => {
                await refetchConnection();
                window.location.reload();
              }, 1500);
            } else {
              toast({
                title: "Reset Mislukt",
                description: "Er ging iets mis bij het resetten van de kalender. Probeer het opnieuw.",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error('[SetupProgress] Error during calendar reset:', error);
            toast({
              title: "Reset Fout",
              description: "Er trad een onverwachte fout op tijdens het resetten.",
              variant: "destructive",
            });
          }
        }
        break;
        
      case 'availability_configured':
        await updateProfileSetupProgress('availability_configured', !completed);
        toast({
          title: completed ? "Beschikbaarheid Reset" : "Beschikbaarheid Geconfigureerd",
          description: completed 
            ? "Beschikbaarheid instellingen zijn gereset" 
            : "Beschikbaarheid is geconfigureerd",
        });
        break;
        
      case 'booking_rules_set':
        await updateProfileSetupProgress('booking_rules_set', !completed);
        toast({
          title: completed ? "Boekingsregels Reset" : "Boekingsregels Ingesteld",
          description: completed 
            ? "Boekingsregels zijn gereset" 
            : "Boekingsregels zijn geconfigureerd",
        });
        break;
    }
  };

  const setupSteps = [
    {
      id: 'calendar_linked',
      title: 'Link Your Calendar',
      description: 'Connect your calendar to start receiving bookings',
      completed: calendarConnected || setupProgress?.calendar_linked || false,
      icon: Calendar,
    },
    {
      id: 'availability_configured', 
      title: 'Configure Availability',
      description: 'Set your working hours and availability preferences',
      completed: setupProgress?.availability_configured || false,
      icon: Clock,
    },
    {
      id: 'booking_rules_set',
      title: 'Set Up Booking Rules', 
      description: 'Define your booking policies and requirements',
      completed: setupProgress?.booking_rules_set || false,
      icon: Target,
    },
  ];

  const completedSteps = setupSteps.filter(step => step.completed).length;
  const totalSteps = setupSteps.length;

  if (loading || calendarLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Setup Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading setup progress...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-3">
            <Target className="h-5 w-5 text-green-600" />
            Setup Progress
          </span>
          <Badge variant="outline">
            {completedSteps}/{totalSteps} completed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 🔥 NUCLEAR DISCONNECT - PROMINENT AT TOP IF CALENDAR IS CONNECTED */}
        {calendarConnected && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-red-900 text-lg">🔥 Kalender Volledig Loskoppelen</h4>
                  <p className="text-red-700 font-medium">
                    Klik hieronder om je Google Calendar direct en definitief los te koppelen.
                    Alle verbindingen, data en sync worden onmiddellijk verwijderd.
                  </p>
                </div>
                <div className="flex justify-center">
                  <NuclearDisconnectButton onSuccess={() => {
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                  }} />
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <SetupProgressIndicator 
          completedSteps={completedSteps}
          totalSteps={totalSteps}
        />

        <div className="space-y-4">
          {setupSteps.map((step) => (
            <SetupStepItem
              key={step.id}
              id={step.id}
              title={step.title}
              description={step.description}
              completed={step.completed}
              icon={step.icon}
              onAction={handleStepAction}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
