
import React, { useState, useEffect } from 'react';
import { useAvailabilityRules } from '@/hooks/useAvailabilityRules';

interface DayAvailabilityProps {
  day: string;
  dayIndex: number;
  scheduleId?: string;
  initialRule?: any;
}

// Helper function to format time to HH:MM
const formatTimeToHHMM = (timeString: string): string => {
  if (!timeString) return '09:00';
  if (timeString.match(/^\d{2}:\d{2}$/)) return timeString;
  if (timeString.match(/^\d{2}:\d{2}:\d{2}$/)) return timeString.substring(0, 5);
  return timeString;
};

export function DayAvailability({ 
  day, 
  dayIndex, 
  scheduleId, 
  initialRule 
}: DayAvailabilityProps) {
  const [isAvailable, setIsAvailable] = useState(initialRule?.is_available ?? true);
  const [startTime, setStartTime] = useState(formatTimeToHHMM(initialRule?.start_time || '09:00'));
  const [endTime, setEndTime] = useState(formatTimeToHHMM(initialRule?.end_time || '17:00'));
  const [hasChanges, setHasChanges] = useState(false);
  
  const { updateRule, createRule } = useAvailabilityRules(scheduleId);

  // Track changes
  useEffect(() => {
    const changed = 
      isAvailable !== (initialRule?.is_available ?? true) ||
      startTime !== formatTimeToHHMM(initialRule?.start_time || '09:00') ||
      endTime !== formatTimeToHHMM(initialRule?.end_time || '17:00');
    setHasChanges(changed);
  }, [isAvailable, startTime, endTime, initialRule]);

  const saveChanges = async () => {
    if (!scheduleId) return;

    try {
      if (initialRule) {
        await updateRule(initialRule.id, {
          is_available: isAvailable,
          start_time: startTime,
          end_time: endTime
        });
      } else {
        await createRule({
          day_of_week: dayIndex,
          start_time: startTime,
          end_time: endTime,
          is_available: isAvailable
        });
      }
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving availability:', error);
    }
  };

  // Auto-save after 1 second of no changes
  useEffect(() => {
    if (hasChanges) {
      const timeout = setTimeout(saveChanges, 1000);
      return () => clearTimeout(timeout);
    }
  }, [hasChanges, isAvailable, startTime, endTime]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${
          isAvailable ? 'text-foreground' : 'text-muted-foreground'
        }`}>
          {day}
        </span>
        
        <button
          onClick={() => setIsAvailable(!isAvailable)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            isAvailable ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              isAvailable ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      
      {isAvailable && (
        <div className="flex items-center space-x-2 text-xs">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(formatTimeToHHMM(e.target.value))}
            className="flex-1 px-2 py-1 bg-background border border-border rounded text-foreground focus:border-primary focus:outline-none"
          />
          <span className="text-muted-foreground">-</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(formatTimeToHHMM(e.target.value))}
            className="flex-1 px-2 py-1 bg-background border border-border rounded text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      )}
      
      {hasChanges && (
        <div className="flex items-center gap-1 text-xs text-yellow-600">
          <div className="w-1 h-1 bg-yellow-600 rounded-full animate-pulse"></div>
          <span>Opslaan...</span>
        </div>
      )}
    </div>
  );
}
