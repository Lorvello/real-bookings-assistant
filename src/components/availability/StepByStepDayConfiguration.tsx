import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Check, Clock, Calendar } from 'lucide-react';
import { AvailabilityDayRow } from './AvailabilityDayRow';
import { useDailyAvailabilityManager } from '@/hooks/useDailyAvailabilityManager';

interface StepByStepDayConfigurationProps {
  onChange: () => void;
}

export const StepByStepDayConfiguration: React.FC<StepByStepDayConfigurationProps> = ({ onChange }) => {
  const {
    DAYS,
    availability,
    setAvailability,
    pendingUpdates,
    syncingRules,
    defaultCalendar,
    defaultSchedule,
    syncToDatabase,
    createDefaultSchedule
  } = useDailyAvailabilityManager(onChange);

  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [debounceTimeouts, setDebounceTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());

  const currentDay = DAYS[currentDayIndex];
  const isFirstDay = currentDayIndex === 0;
  const isLastDay = currentDayIndex === DAYS.length - 1;

  const updateDayEnabled = async (dayKey: string, enabled: boolean) => {
    const newAvailability = {
      ...availability,
      [dayKey]: { ...availability[dayKey], enabled }
    };
    
    setAvailability(newAvailability);
    
    // Clear any existing timeout for this day
    const existingTimeout = debounceTimeouts.get(dayKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      syncToDatabase(dayKey, newAvailability[dayKey]);
      setDebounceTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(dayKey);
        return newMap;
      });
    }, 800);
    
    setDebounceTimeouts(prev => new Map(prev).set(dayKey, timeout));
  };

  const updateTimeBlock = async (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => {
    const currentBlocks = availability[dayKey].timeBlocks;
    const updatedBlocks = currentBlocks.map(block =>
      block.id === blockId ? { ...block, [field]: value } : block
    );

    // Validate for duplicate times before updating
    const hasDuplicates = updatedBlocks.some((block, index) => 
      updatedBlocks.findIndex(b => b.startTime === block.startTime && b.endTime === block.endTime) !== index
    );

    if (hasDuplicates) {
      console.warn(`Duplicate time block detected for ${dayKey}, not updating`);
      return;
    }

    const newAvailability = {
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        timeBlocks: updatedBlocks
      }
    };
    
    setAvailability(newAvailability);
    
    // Clear any existing timeout for this specific update
    const timeoutKey = `${dayKey}-${blockId}-${field}`;
    const existingTimeout = debounceTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout with longer delay for time changes
    const timeout = setTimeout(() => {
      syncToDatabase(dayKey, newAvailability[dayKey]);
      setDebounceTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(timeoutKey);
        return newMap;
      });
    }, 1500);
    
    setDebounceTimeouts(prev => new Map(prev).set(timeoutKey, timeout));
  };

  const addTimeBlock = async (dayKey: string) => {
    const currentBlocks = availability[dayKey].timeBlocks;
    const newBlockId = `${dayKey}-${Date.now()}`; 
    const lastBlock = currentBlocks[currentBlocks.length - 1];
    
    // Calculate next available start time
    let newStartTime = lastBlock?.endTime || '09:00';
    let newEndTime = '17:00';
    
    // If the last block ends at or after 17:00, start the new block at a reasonable time
    if (newStartTime >= '17:00') {
      newStartTime = '08:00';
      newEndTime = '12:00';
    }

    const newTimeBlock = {
      id: newBlockId,
      startTime: newStartTime,
      endTime: newEndTime
    };

    // Check for duplicates before adding
    const wouldCreateDuplicate = currentBlocks.some(block => 
      block.startTime === newTimeBlock.startTime && block.endTime === newTimeBlock.endTime
    );

    if (wouldCreateDuplicate) {
      console.warn(`Would create duplicate time block for ${dayKey}, not adding`);
      return;
    }
    
    const newAvailability = {
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        timeBlocks: [...currentBlocks, newTimeBlock]
      }
    };
    
    setAvailability(newAvailability);
    
    // Immediate sync for adding blocks
    await syncToDatabase(dayKey, newAvailability[dayKey]);
  };

  const removeTimeBlock = async (dayKey: string, blockId: string) => {
    // Don't allow removing the last time block
    if (availability[dayKey].timeBlocks.length <= 1) {
      console.log('Cannot remove the last time block');
      return;
    }
    
    const newAvailability = {
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        timeBlocks: availability[dayKey].timeBlocks.filter(block => block.id !== blockId)
      }
    };
    
    setAvailability(newAvailability);
    
    // Immediate sync for removing blocks
    await syncToDatabase(dayKey, newAvailability[dayKey]);
  };

  const toggleDropdown = (dropdownId: string) => {
    setOpenDropdowns(prev => {
      const newState: Record<string, boolean> = {};
      Object.keys(prev).forEach(key => {
        newState[key] = false;
      });
      newState[dropdownId] = !prev[dropdownId];
      return newState;
    });
  };

  const closeDropdown = (dropdownId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdownId]: false
    }));
  };

  const goToNextDay = () => {
    if (!isLastDay) {
      setCurrentDayIndex(prev => prev + 1);
    }
  };

  const goToPreviousDay = () => {
    if (!isFirstDay) {
      setCurrentDayIndex(prev => prev - 1);
    }
  };

  const getDayStatus = (dayIndex: number) => {
    const day = DAYS[dayIndex];
    const dayAvailability = availability[day.key];
    
    if (dayAvailability.enabled && dayAvailability.timeBlocks.length > 0) {
      return 'configured';
    }
    
    return 'pending';
  };

  // Show loading state if we don't have calendar data yet
  if (!defaultCalendar) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-6 h-6 bg-primary rounded-full animate-spin mx-auto mb-3"></div>
          <div className="text-base text-muted-foreground">Loading availability...</div>
        </div>
      </div>
    );
  }

  // Show empty state if no availability schedule exists
  if (!defaultSchedule) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-card/90 backdrop-blur-sm border-border/60 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground mb-3">
              Set Your Availability
            </CardTitle>
            <p className="text-muted-foreground leading-relaxed">
              Configure your working hours to let customers know when you're available for bookings. 
              We'll guide you through setting up each day of the week.
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={createDefaultSchedule}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
            >
              Start Configuration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/20 rounded-xl">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Configure {currentDay.label}
              </h2>
              <p className="text-sm text-muted-foreground">
                Step {currentDayIndex + 1} of {DAYS.length}
              </p>
            </div>
          </div>
          
          {/* Day Progress Indicators */}
          <div className="flex items-center space-x-2">
            {DAYS.map((day, index) => (
              <div
                key={day.key}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                  index === currentDayIndex
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : getDayStatus(index) === 'configured'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {getDayStatus(index) === 'configured' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  day.label.substring(0, 1)
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-muted/50 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${((currentDayIndex + 1) / DAYS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Day Configuration */}
      <Card className="bg-card/90 backdrop-blur-sm border border-border/60 shadow-lg">
        <CardContent className="p-6">
          <AvailabilityDayRow
            day={currentDay}
            dayAvailability={availability[currentDay.key]}
            openDropdowns={openDropdowns}
            hasPendingUpdates={Array.from(pendingUpdates).some(id => id.startsWith(currentDay.key))}
            hasSyncingRules={Array.from(syncingRules).some(id => false)} // Simplified for now
            onUpdateDayEnabled={updateDayEnabled}
            onUpdateTimeBlock={updateTimeBlock}
            onAddTimeBlock={addTimeBlock}
            onRemoveTimeBlock={removeTimeBlock}
            onToggleDropdown={toggleDropdown}
            onCloseDropdown={closeDropdown}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goToPreviousDay}
          disabled={isFirstDay}
          className="px-6 py-2 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous Day
        </Button>
        
        <div className="text-sm text-muted-foreground">
          {currentDayIndex + 1} of {DAYS.length} days configured
        </div>
        
        <Button
          onClick={goToNextDay}
          disabled={isLastDay}
          className="px-6 py-2 disabled:opacity-50"
        >
          Next Day
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};