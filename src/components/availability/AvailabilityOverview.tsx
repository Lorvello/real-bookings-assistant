import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2 } from 'lucide-react';
import { useDailyAvailabilityManager } from '@/hooks/useDailyAvailabilityManager';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { GuidedAvailabilityModal } from './GuidedAvailabilityModal';
import { DailyAvailability } from './DailyAvailability';

interface AvailabilityOverviewProps {
  onChange?: () => void;
}

export const AvailabilityOverview: React.FC<AvailabilityOverviewProps> = ({ onChange }) => {
  const [isGuidedModalOpen, setIsGuidedModalOpen] = useState(false);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const hasAttemptedCreate = useRef(false);
  
  const {
    defaultCalendar,
    defaultSchedule,
    createDefaultSchedule
  } = useDailyAvailabilityManager(onChange || (() => {}));

  const { refreshCalendars } = useCalendarContext();

  // Auto-create default schedule if calendar exists but no schedule
  useEffect(() => {
    const autoCreateSchedule = async () => {
      if (defaultCalendar && !defaultSchedule && !isCreatingSchedule && !hasAttemptedCreate.current) {
        hasAttemptedCreate.current = true;
        setIsCreatingSchedule(true);
        try {
          console.log('Auto-creating default schedule for new calendar:', defaultCalendar.id);
          await createDefaultSchedule();
        } catch (error) {
          console.error('Failed to auto-create schedule:', error);
        } finally {
          setIsCreatingSchedule(false);
        }
      }
    };
    
    autoCreateSchedule();
  }, [defaultCalendar, defaultSchedule, createDefaultSchedule, isCreatingSchedule]);

  // Reset the attempt flag when calendar changes
  useEffect(() => {
    hasAttemptedCreate.current = false;
  }, [defaultCalendar?.id]);

  const handleGuidedComplete = () => {
    onChange?.();
    setIsGuidedModalOpen(false);
  };

  if (!defaultCalendar || !defaultSchedule) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-muted-foreground">
            {isCreatingSchedule ? 'Setting up availability...' : 'Loading availability...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold">Weekly Hours</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsGuidedModalOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit All
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <DailyAvailability onChange={onChange || (() => {})} />
        </CardContent>
      </Card>

      {/* Guided Reconfiguration Modal */}
      <GuidedAvailabilityModal
        isOpen={isGuidedModalOpen}
        onClose={() => setIsGuidedModalOpen(false)}
        onComplete={handleGuidedComplete}
        editMode={true}
        selectedCalendar={defaultCalendar ? { id: defaultCalendar.id, timezone: defaultCalendar.timezone } : undefined}
        refreshCalendars={refreshCalendars}
      />
    </div>
  );
};
