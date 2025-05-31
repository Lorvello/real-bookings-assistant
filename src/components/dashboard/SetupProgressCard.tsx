
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Calendar, Clock, Target, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarLinking } from '@/hooks/useCalendarLinking';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useToast } from '@/hooks/use-toast';

interface SetupProgressCardProps {
  onCalendarModalOpen: () => void;
}

export const SetupProgressCard: React.FC<SetupProgressCardProps> = ({
  onCalendarModalOpen
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { setupProgress, updateSetupProgress, loading } = useProfile(user);
  const { isConnected: calendarConnected, loading: calendarLoading, refetchConnection } = useCalendarLinking(user);
  const { connections, disconnectProvider, refetch: refetchConnections } = useCalendarIntegration(user);

  const handleStepAction = async (step: string, completed: boolean) => {
    switch (step) {
      case 'calendar_linked':
        if (!completed) {
          console.log('[SetupProgress] Opening calendar modal');
          onCalendarModalOpen();
        } else {
          console.log('[SetupProgress] Disconnecting all calendar connections');
          
          // Disconnect all active calendar connections
          let disconnectedAny = false;
          for (const connection of connections) {
            if (connection.is_active) {
              const success = await disconnectProvider(connection.id);
              if (success) {
                disconnectedAny = true;
              }
            }
          }
          
          if (disconnectedAny) {
            // Update setup progress
            await updateSetupProgress('calendar_linked', false);
            
            // Refresh connections
            await refetchConnections();
            await refetchConnection();
            
            toast({
              title: "Kalender Ontkoppeld",
              description: "Alle kalender verbindingen zijn ontkoppeld",
            });
          } else {
            toast({
              title: "Fout",
              description: "Kon kalender niet ontkoppelen",
              variant: "destructive",
            });
          }
        }
        break;
      case 'availability_configured':
        await updateSetupProgress('availability_configured', !completed);
        toast({
          title: completed ? "Beschikbaarheid Reset" : "Beschikbaarheid Geconfigureerd",
          description: completed 
            ? "Beschikbaarheid instellingen zijn gereset" 
            : "Beschikbaarheid is geconfigureerd",
        });
        break;
      case 'booking_rules_set':
        await updateSetupProgress('booking_rules_set', !completed);
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
  const progressPercentage = (completedSteps / totalSteps) * 100;

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
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="space-y-4">
          {setupSteps.map((step) => {
            const IconComponent = step.icon;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  step.completed 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className={`p-2 rounded-full ${
                  step.completed ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <IconComponent className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    step.completed ? 'text-green-900' : 'text-gray-900'
                  }`}>
                    {step.title}
                  </h4>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>

                <Button
                  variant={step.completed ? "outline" : "default"}
                  size="sm"
                  className={step.completed ? "text-red-600 hover:text-red-700" : ""}
                  onClick={() => handleStepAction(step.id, step.completed)}
                >
                  {step.completed ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset
                    </>
                  ) : (
                    'Complete'
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
