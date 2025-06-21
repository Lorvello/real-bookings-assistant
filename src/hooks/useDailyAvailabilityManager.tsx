
import { useState, useEffect, useMemo } from 'react';
import { useAvailabilitySchedules } from '@/hooks/useAvailabilitySchedules';
import { useAvailabilityRules } from '@/hooks/useAvailabilityRules';
import { useCalendars } from '@/hooks/useCalendars';
import { supabase } from '@/integrations/supabase/client';

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

// Helper function to validate and clean time blocks
const validateAndCleanTimeBlocks = (timeBlocks: TimeBlock[]): TimeBlock[] => {
  // Remove duplicates based on start and end time
  const uniqueBlocks = timeBlocks.filter((block, index, self) => 
    index === self.findIndex(b => b.startTime === block.startTime && b.endTime === block.endTime)
  );
  
  // Sort by start time
  return uniqueBlocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
};

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
  const [syncTimeouts, setSyncTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());

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

  // Cleanup function voor duplicaten
  const cleanupDuplicates = async (scheduleId: string, dayOfWeek: number) => {
    try {
      await supabase.rpc('cleanup_duplicate_availability_rules', {
        p_schedule_id: scheduleId,
        p_day_of_week: dayOfWeek
      });
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
    }
  };

  // Verbeterde sync function met duplicate cleanup
  const syncToDatabase = async (dayKey: string, dayData: DayAvailability) => {
    if (!defaultSchedule?.id) return;
    
    const day = DAYS.find(d => d.key === dayKey);
    if (!day) return;

    // Clear any existing timeout for this day
    const existingTimeout = syncTimeouts.get(dayKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      syncTimeouts.delete(dayKey);
    }

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
      
      // Ruim eerst duplicaten op
      await cleanupDuplicates(defaultSchedule.id, day.dayOfWeek);
      
      // Get existing rules for this day
      const existingRules = rules.filter(rule => rule.day_of_week === day.dayOfWeek);
      console.log(`Found ${existingRules.length} existing rules for ${dayKey}`);
      
      // Delete all existing rules for this day
      for (const rule of existingRules) {
        console.log(`Deleting rule ${rule.id} for ${dayKey}`);
        await deleteRule(rule.id);
      }

      // Wait to ensure deletions are processed
      await new Promise(resolve => setTimeout(resolve, 300));

      if (dayData.enabled && dayData.timeBlocks.length > 0) {
        // Clean and validate time blocks before creating rules
        const cleanedTimeBlocks = validateAndCleanTimeBlocks(dayData.timeBlocks);
        console.log(`Creating ${cleanedTimeBlocks.length} new rules for ${dayKey}`);
        
        // Create new rules with improved error handling
        for (const timeBlock of cleanedTimeBlocks) {
          // Validate time block
          if (timeBlock.startTime >= timeBlock.endTime) {
            console.warn(`Invalid time block for ${dayKey}: ${timeBlock.startTime} - ${timeBlock.endTime}, skipping`);
            continue;
          }

          console.log(`Creating rule for ${dayKey}: ${timeBlock.startTime} - ${timeBlock.endTime}`);
          try {
            await createRule({
              day_of_week: day.dayOfWeek,
              start_time: timeBlock.startTime,
              end_time: timeBlock.endTime,
              is_available: true
            });
            
            // Small delay between creates to prevent conflicts
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (createError: any) {
            console.error(`Error creating rule for ${dayKey}:`, createError);
            
            // Als het nog steeds een duplicate error is, probeer cleanup en retry
            if (createError.message?.includes('duplicate key')) {
              console.log(`Duplicate detected, cleaning up and retrying for ${dayKey}`);
              await cleanupDuplicates(defaultSchedule.id, day.dayOfWeek);
              await new Promise(resolve => setTimeout(resolve, 200));
              
              // Retry once
              try {
                await createRule({
                  day_of_week: day.dayOfWeek,
                  start_time: timeBlock.startTime,
                  end_time: timeBlock.endTime,
                  is_available: true
                });
              } catch (retryError) {
                console.error(`Retry failed for ${dayKey}:`, retryError);
              }
            }
          }
        }
      } else {
        console.log(`Creating unavailable rule for ${dayKey}`);
        // Create an unavailable rule for the day
        try {
          await createRule({
            day_of_week: day.dayOfWeek,
            start_time: '09:00',
            end_time: '17:00',
            is_available: false
          });
        } catch (error: any) {
          if (error.message?.includes('duplicate key')) {
            await cleanupDuplicates(defaultSchedule.id, day.dayOfWeek);
          }
        }
      }
      
      console.log(`Sync completed successfully for ${dayKey}`);
      onChange();
    } catch (error) {
      console.error(`Error syncing ${dayKey} to database:`, error);
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      syncTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [syncTimeouts]);

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
