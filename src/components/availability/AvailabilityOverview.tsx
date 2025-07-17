import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Edit2, Plus } from 'lucide-react';
import { useDailyAvailabilityManager } from '@/hooks/useDailyAvailabilityManager';
import { SingleDayEditModal } from './SingleDayEditModal';
import { GuidedAvailabilityModal } from './GuidedAvailabilityModal';

interface AvailabilityOverviewProps {
  onChange?: () => void;
}

export const AvailabilityOverview: React.FC<AvailabilityOverviewProps> = ({ onChange }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGuidedModalOpen, setIsGuidedModalOpen] = useState(false);
  const [editDay, setEditDay] = useState<number | null>(null);
  
  const {
    DAYS,
    availability,
    defaultCalendar,
    defaultSchedule
  } = useDailyAvailabilityManager(onChange || (() => {}));

  const handleEditDay = (dayIndex: number) => {
    setEditDay(dayIndex);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setEditDay(null);
  };

  const handleModalComplete = () => {
    onChange?.();
    handleModalClose();
  };

  const handleGuidedComplete = () => {
    onChange?.();
    setIsGuidedModalOpen(false);
  };

  const formatTimeRange = (timeBlocks: any[]) => {
    if (!timeBlocks || timeBlocks.length === 0) return 'Not available';
    
    return timeBlocks
      .map(block => {
        // Ensure proper formatting: HH:MM
        const formatTime = (time: string) => {
          if (!time) return '09:00';
          return time.length === 5 ? time : time.substring(0, 5);
        };
        return `${formatTime(block.startTime)} - ${formatTime(block.endTime)}`;
      })
      .join(', ');
  };

  const getAvailabilityStatus = () => {
    if (!availability) return { total: 7, configured: 0, isComplete: false };
    
    // Count days that are either enabled with time blocks OR explicitly disabled
    const configuredDays = DAYS.filter(day => {
      const dayData = availability[day.key];
      return dayData && (
        (dayData.enabled && dayData.timeBlocks?.length > 0) ||
        (!dayData.enabled)
      );
    });
    
    return {
      total: DAYS.length,
      configured: configuredDays.length,
      isComplete: configuredDays.length === DAYS.length
    };
  };

  const status = getAvailabilityStatus();

  if (!defaultCalendar || !defaultSchedule) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-muted-foreground">Loading availability...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/20 rounded-2xl">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Your Availability</h2>
              <p className="text-muted-foreground">
                {status.isComplete ? 'Schedule configured' : `${status.configured} of ${status.total} days configured`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGuidedModalOpen(true)}
              className="flex items-center space-x-2 text-primary border-primary/20 hover:bg-primary/10"
            >
              <Edit2 className="h-4 w-4" />
              <span>Reconfigure All</span>
            </Button>
            
          </div>
        </div>
      </div>

      {/* Weekly Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DAYS.map((day, dayIndex) => {
          const dayData = availability[day.key];
          const isConfigured = dayData?.enabled && dayData?.timeBlocks?.length > 0;
          
          return (
            <Card 
              key={day.key} 
              className={`bg-card/90 backdrop-blur-sm border transition-all duration-200 hover:shadow-lg ${
                isConfigured 
                  ? 'border-primary/30 hover:border-primary/50' 
                  : 'border-border/60 hover:border-border'
              }`}
            >
              <CardContent className="p-5">
                <div className="space-y-4">
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        isConfigured ? 'bg-green-500' : 'bg-muted'
                      }`} />
                      <div>
                        <h3 className="font-semibold text-foreground">{day.label}</h3>
                        <p className="text-xs text-muted-foreground">
                          {day.isWeekend ? 'Weekend' : 'Weekday'}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEditDay(dayIndex)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Availability Info */}
                  <div className="space-y-2">
                    {isConfigured ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-emerald-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">Available</span>
                        </div>
                        <div className="text-sm text-foreground/90 font-medium">
                          {formatTimeRange(dayData.timeBlocks)}
                        </div>
                        {dayData.timeBlocks.length > 1 && (
                          <div className="text-xs text-muted-foreground">
                            {dayData.timeBlocks.length} time blocks
                          </div>
                        )}
                      </div>
                    ) : dayData?.enabled === false ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Unavailable</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Day marked as unavailable
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Plus className="h-4 w-4" />
                          <span className="text-sm">Not configured</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Click to set availability
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>


      {/* Edit Modal */}
      {editDay !== null && availability[DAYS[editDay]?.key] && (
        <SingleDayEditModal
          isOpen={isEditModalOpen}
          onClose={handleModalClose}
          onComplete={handleModalComplete}
          dayIndex={editDay}
          dayData={availability[DAYS[editDay].key]}
          dayLabel={DAYS[editDay].label}
        />
      )}

      {/* Guided Reconfiguration Modal */}
      <GuidedAvailabilityModal
        isOpen={isGuidedModalOpen}
        onClose={() => setIsGuidedModalOpen(false)}
        onComplete={handleGuidedComplete}
        editMode={true}
        selectedCalendar={defaultCalendar ? { id: defaultCalendar.id, timezone: defaultCalendar.timezone } : undefined}
      />
    </div>
  );
};