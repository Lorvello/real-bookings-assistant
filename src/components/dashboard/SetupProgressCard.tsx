
/**
 * 🚀 SETUP PROGRESS TRACKING CARD
 * ===============================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Dit component is de kern van de guided onboarding experience die ervoor zorgt dat
 * gebruikers binnen 3 minuten volledig operationeel zijn. Het toont de essentiële
 * setup stappen die nodig zijn om het autonome WhatsApp booking systeem te activeren.
 * 
 * 🎪 BUSINESS CRITICAL FUNCTIONS:
 * - Visual progress tracking naar 100% system activation
 * - Action-oriented buttons voor elke incomplete setup stap
 * - Real-time status updates via live data connections
 * - "Reset" functionaliteit voor troubleshooting en re-onboarding
 * 
 * 📊 SUCCESS METRICS IMPACT:
 * - Target: 100% activatie binnen 3 minuten na registratie
 * - Guided experience vermindert support tickets (< 5% per maand)
 * - Clear progress indicators verhogen completion rates
 * - Reset functionaliteit voorkomt abandon rates bij problemen
 * 
 * 🔗 SYSTEM INTEGRATIONS:
 * - Calendar connections: Real-time status via useCalendarLinking hook
 * - Setup progress: Database tracking via useProfile hook  
 * - Modal triggers: Calendar setup modal voor seamless OAuth flow
 * - Notification system: Toast feedback voor alle user actions
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarLinking } from '@/hooks/useCalendarLinking';
import { useToast } from '@/hooks/use-toast';
import { SetupProgressIndicator } from './SetupProgressIndicator';
import { SetupStepItem } from './SetupStepItem';
import { disconnectAllCalendarConnections } from '@/utils/calendar/connectionDisconnect';

interface SetupProgressCardProps {
  onCalendarModalOpen: () => void;
}

/**
 * 🎮 Main component voor setup progress tracking en management
 * 
 * FEATURES:
 * - Visual progress bar met completion percentage
 * - Interactive setup steps met action buttons
 * - Real-time status updates zonder page refresh
 * - Calendar reset functionaliteit voor troubleshooting
 * - Loading states voor smooth user experience
 * 
 * @param onCalendarModalOpen - Callback voor calendar setup modal trigger
 */
export const SetupProgressCard: React.FC<SetupProgressCardProps> = ({
  onCalendarModalOpen
}) => {
  // 🔐 AUTHENTICATION & DATA HOOKS
  const { user } = useAuth();
  const { toast } = useToast();
  
  // 📊 Setup progress data van database
  const { setupProgress, updateSetupProgress: updateProfileSetupProgress, loading } = useProfile(user);
  
  // 📅 Real-time calendar connection status
  const { isConnected: calendarConnected, loading: calendarLoading, refetchConnection } = useCalendarLinking(user);

  /**
   * 🎯 Handles user actions voor setup step completion/reset
   * 
   * CALENDAR WORKFLOW:
   * - Not completed: Open modal voor new connection setup
   * - Completed: Full reset van alle connections met guided re-setup
   * 
   * OTHER STEPS WORKFLOW:  
   * - Toggle boolean status in database
   * - Provide immediate user feedback via toast
   * - Update local state voor immediate UI response
   * 
   * @param step - Setup step identifier (calendar_linked, availability_configured, etc.)
   * @param completed - Current completion status voor toggle logic
   */
  const handleStepAction = async (step: string, completed: boolean) => {
    if (!user) {
      console.error('[SetupProgress] No user available for step action');
      return;
    }

    switch (step) {
      case 'calendar_linked':
        if (!completed) {
          // 🆕 NEW CONNECTION: Open guided setup modal
          console.log('[SetupProgress] Opening calendar modal');
          onCalendarModalOpen();
        } else {
          // 🔥 RESET EXISTING: Full disconnect voor clean slate
          console.log('[SetupProgress] Resetting calendar - disconnecting all connections');
          
          try {
            // 🚀 Execute full calendar reset
            const success = await disconnectAllCalendarConnections(user);
            
            if (success) {
              // ✅ SUCCESS: Notify user en trigger UI refresh
              toast({
                title: "Kalender Reset",
                description: "Alle kalender verbindingen zijn succesvol ontkoppeld",
              });
              
              // 🔄 Refresh connection status na short delay voor database consistency
              setTimeout(async () => {
                await refetchConnection();
                window.location.reload(); // Force full refresh voor clean state
              }, 1500);
            } else {
              // ❌ FAILURE: User guidance voor retry
              toast({
                title: "Reset Mislukt",
                description: "Er ging iets mis bij het resetten van de kalender. Probeer het opnieuw.",
                variant: "destructive",
              });
            }
          } catch (error) {
            // 🚨 UNEXPECTED ERROR: Error logging en user notification
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
        // 🕒 AVAILABILITY TOGGLE: Simple boolean flip in database
        await updateProfileSetupProgress('availability_configured', !completed);
        toast({
          title: completed ? "Beschikbaarheid Reset" : "Beschikbaarheid Geconfigureerd",
          description: completed 
            ? "Beschikbaarheid instellingen zijn gereset" 
            : "Beschikbaarheid is geconfigureerd",
        });
        break;
        
      case 'booking_rules_set':
        // 📋 BOOKING RULES TOGGLE: Simple boolean flip in database
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

  // 📊 SETUP STEPS CONFIGURATION
  // Defines alle required setup steps met icons, descriptions en completion logic
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

  // 🧮 PROGRESS CALCULATION
  const completedSteps = setupSteps.filter(step => step.completed).length;
  const totalSteps = setupSteps.length;

  // 🔄 LOADING STATE HANDLING
  // Show loading spinner tijdens data fetch voor smooth UX
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

  // 🎨 MAIN COMPONENT RENDER
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-3">
            <Target className="h-5 w-5 text-green-600" />
            Setup Progress
          </span>
          {/* 📊 Progress badge met completion ratio */}
          <Badge variant="outline">
            {completedSteps}/{totalSteps} completed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 📈 Visual progress indicator */}
        <SetupProgressIndicator 
          completedSteps={completedSteps}
          totalSteps={totalSteps}
        />

        {/* 📋 Individual setup steps met action buttons */}
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

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * Dit component is essentieel voor het behalen van de 100% activatie binnen 3 minuten target.
 * Het begeleidt gebruikers door de minimale vereiste setup stappen om het autonome WhatsApp
 * booking systeem volledig operationeel te krijgen.
 * 
 * CRITICAL SUCCESS FACTORS:
 * - Calendar connection: Zonder dit kan de WhatsApp bot geen beschikbaarheid controleren
 * - Availability setup: Bepaalt wanneer klanten kunnen boeken via de bot
 * - Booking rules: Configuratie voor advanced features zoals buffers en advance booking
 * 
 * USER EXPERIENCE PRINCIPLES:
 * - Immediate visual feedback voor alle acties
 * - Clear progress indication om momentum te behouden  
 * - Reset functionality voor recovery van problemen
 * - Loading states om perceived performance te verbeteren
 * 
 * BUSINESS IMPACT:
 * - Verhoogt completion rates door guided experience
 * - Vermindert support tickets door self-service troubleshooting
 * - Zorgt voor consistent system activation across alle gebruikers
 * - Meetbare progress tracking voor success metrics
 * 
 * INTEGRATION DEPENDENCIES:
 * - Calendar OAuth flows voor seamless connection setup
 * - Real-time database updates voor accurate progress tracking
 * - Toast notification system voor user feedback
 * - Modal system voor guided sub-workflows
 */
