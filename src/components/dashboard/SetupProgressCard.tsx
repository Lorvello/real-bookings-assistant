import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarLinking } from '@/hooks/useCalendarLinking';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useToast } from '@/hooks/use-toast';
import { SetupProgressIndicator } from './SetupProgressIndicator';
import { SetupStepItem } from './SetupStepItem';
import { disconnectAllCalendarConnections } from '@/utils/calendar/connectionDisconnect';
import { updateSetupProgress } from '@/utils/calendar/setupProgressManager';

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
  const { connections, disconnectProvider, refetch: refetchConnections } = useCalendarIntegration(user);

  const handleStepAction = async (step: string, completed: boolean) => {
    switch (step) {
      case 'calendar_linked':
        if (!completed) {
          console.log('[SetupProgress] Opening calendar modal');
          onCalendarModalOpen();
        } else {
          console.log('[SetupProgress] Resetting calendar - disconnecting all connections');
          
          try {
            let disconnectedAny = false;
            
            // Disconnect all active calendar connections one by one
            for (const connection of connections) {
              if (connection.is_active) {
                console.log(`[SetupProgress] Disconnecting connection: ${connection.id} (${connection.provider})`);
                const success = await disconnectProvider(connection.id);
                if (success) {
                  disconnectedAny = true;
                  console.log(`[SetupProgress] Successfully disconnected ${connection.provider}`);
                } else {
                  console.error(`[SetupProgress] Failed to disconnect ${connection.provider}`);
                }
              }
            }
            
            // Use the specialized utility function to update setup progress
            if (user) {
              await updateSetupProgress(user, false);
            }
            
            // Refresh connection status
            await refetchConnections();
            await refetchConnection();
            
            if (disconnectedAny) {
              toast({
                title: "Kalender Reset",
                description: "Alle kalender verbindingen zijn succesvol ontkoppeld",
              });
            } else {
              toast({
                title: "Kalender Reset",
                description: "Kalender status is gereset",
              });
            }
            
            // Force a page reload to ensure all states are updated
            setTimeout(() => {
              window.location.reload();
            }, 1500);
            
          } catch (error) {
            console.error('[SetupProgress] Error during calendar reset:', error);
            
            // Even if there's an error, try to update the setup progress
            try {
              if (user) {
                await updateSetupProgress(user, false);
              }
              toast({
                title: "Kalender Status Gereset",
                description: "De kalender status is gereset, maar er kunnen nog verbindingen actief zijn",
                variant: "destructive",
              });
            } catch (progressError) {
              console.error('[SetupProgress] Failed to update setup progress:', progressError);
              toast({
                title: "Reset Mislukt",
                description: "Er ging iets mis bij het resetten van de kalender. Probeer het opnieuw.",
                variant: "destructive",
              });
            }
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
