
import { useState, useEffect, useMemo } from 'react';
import { useAvailabilitySchedules } from '@/hooks/useAvailabilitySchedules';
import { useAvailabilityRules } from '@/hooks/useAvailabilityRules';
import { useCalendars } from '@/hooks/useCalendars';

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  enabled: boolean;
  timeBlocks: TimeBlock[];
}

interface Day {
  key: string;
  label: string;
  isWeekend: boolean;
  dayOfWeek: number;
}

const DAYS = [
  { key: 'monday', label: 'Monday', isWeekend: false, dayOfWeek: 1 },
  { key: 'tuesday', label: 'Tuesday', isWeekend: false, dayOfWeek: 2 },
  { key: 'wednesday', label: 'Wednesday', isWeekend: false, dayOfWeek: 3 },
  { key: 'thursday', label: 'Thursday', isWeekend: false, dayOfWeek: 4 },
  { key: 'friday', label: 'Friday', isWeekend: false, dayOfWeek: 5 },
  { key: 'saturday', label: 'Saturday', isWeekend: true, dayOfWeek: 6 },
  { key: 'sunday', label: 'Sunday', isWeekend: true, dayOfWeek: 0 }
];

export const useDailyAvailabilityManager = (onChange: () => void) => {
  const { calendars } = useCalendars();
  const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
  
  const { schedules } = useAvailabilitySchedules(defaultCalendar?.id);
  const defaultSchedule = schedules.find(s => s.is_default) || schedules[0];
  
  const { rules, createRule, updateRule, deleteRule, syncingRules } = useAvailabilityRules(defaultSchedule?.id);

  const [availability, setAvailability] = useState<Record<string, DayAvailability>>(() => {
    const initial: Record<string, DayAvailability> = {};
    DAYS.forEach(day => {
      initial[day.key] = {
        enabled: !day.isWeekend,
        timeBlocks: [{
          id: `${day.key}-1`,
          startTime: '08:00',
          endTime: '19:00'
        }]
      };
    });
    return initial;
  });

  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState<Set<string>>(new Set());

  // Convert database rules to UI availability format
  const availabilityFromRules = useMemo(() => {
    const result: Record<string, DayAvailability> = {};
    
    DAYS.forEach(day => {
      const dayRules = rules.filter(rule => rule.day_of_week === day.dayOfWeek);
      
      if (dayRules.length > 0) {
        const availableRules = dayRules.filter(rule => rule.is_available);
        
        result[day.key] = {
          enabled: availableRules.length > 0,
          timeBlocks: availableRules.length > 0 
            ? availableRules.map((rule, index) => ({
                id: `${day.key}-${index + 1}`,
                startTime: rule.start_time,
                endTime: rule.end_time
              }))
            : [{
                id: `${day.key}-1`,
                startTime: '08:00',
                endTime: '19:00'
              }]
        };
      } else {
        result[day.key] = {
          enabled: !day.isWeekend,
          timeBlocks: [{
            id: `${day.key}-1`,
            startTime: '08:00',
            endTime: '19:00'
          }]
        };
      }
    });
    
    return result;
  }, [rules]);

  // Update local state when rules change
  useEffect(() => {
    setAvailability(availabilityFromRules);
  }, [availabilityFromRules]);

  // Improved sync function with sequential operations to prevent conflicts
  const syncToDatabase = async (dayKey: string, dayData: DayAvailability) => {
    if (!defaultSchedule?.id) return;
    
    const day = DAYS.find(d => d.key === dayKey);
    if (!day) return;

    // Prevent concurrent syncs for the same day
    if (syncing.has(dayKey)) {
      console.log(`Sync already in progress for ${dayKey}, skipping...`);
      return;
    }

    const updateId = `${dayKey}-${Date.now()}`;
    setPendingUpdates(prev => new Set(prev).add(updateId));
    setSyncing(prev => new Set(prev).add(dayKey));

    try {
      console.log(`Starting sync for ${dayKey}:`, dayData);
      
      // Get existing rules for this day
      const existingRules = rules.filter(rule => rule.day_of_week === day.dayOfWeek);
      console.log(`Found ${existingRules.length} existing rules for ${dayKey}`);
      
      // Delete all existing rules for this day first (sequential to avoid conflicts)
      for (const rule of existingRules) {
        console.log(`Deleting rule ${rule.id} for ${dayKey}`);
        await deleteRule(rule.id);
      }

      // Wait a bit to ensure deletions are processed
      await new Promise(resolve => setTimeout(resolve, 100));

      if (dayData.enabled && dayData.timeBlocks.length > 0) {
        console.log(`Creating ${dayData.timeBlocks.length} new rules for ${dayKey}`);
        
        // Create new rules sequentially to avoid conflicts
        for (const timeBlock of dayData.timeBlocks) {
          console.log(`Creating rule for ${dayKey}: ${timeBlock.startTime} - ${timeBlock.endTime}`);
          try {
            await createRule({
              day_of_week: day.dayOfWeek,
              start_time: timeBlock.startTime,
              end_time: timeBlock.endTime,
              is_available: true
            });
          } catch (createError) {
            console.error(`Error creating rule for ${dayKey}:`, createError);
            // Continue with other time blocks even if one fails
          }
        }
      } else {
        console.log(`Creating unavailable rule for ${dayKey}`);
        // Create an unavailable rule for the day
        await createRule({
          day_of_week: day.dayOfWeek,
          start_time: '09:00',
          end_time: '17:00',
          is_available: false
        });
      }
      
      console.log(`Sync completed successfully for ${dayKey}`);
      onChange();
    } catch (error) {
      console.error(`Error syncing ${dayKey} to database:`, error);
      
      // Enhanced error handling
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          console.warn('Detected duplicate key error for', dayKey);
          // Don't retry immediately, let the user try again
        } else if (error.message.includes('violates unique constraint')) {
          console.warn('Unique constraint violation for', dayKey);
        }
      }
    } finally {
      setPendingUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(updateId);
        return newSet;
      });
      setSyncing(prev => {
        const newSet = new Set(prev);
        newSet.delete(dayKey);
        return newSet;
      });
    }
  };

  return {
    DAYS,
    availability,
    setAvailability,
    pendingUpdates,
    syncingRules,
    defaultCalendar,
    defaultSchedule,
    syncToDatabase
  };
};
