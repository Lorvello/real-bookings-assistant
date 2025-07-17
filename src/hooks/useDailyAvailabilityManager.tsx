
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAvailabilitySchedules } from '@/hooks/useAvailabilitySchedules';
import { useAvailabilityRules } from '@/hooks/useAvailabilityRules';
import { useCalendarContext } from '@/contexts/CalendarContext';
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
  { key: 'sunday', label: 'Sunday', isWeekend: true, dayOfWeek: 7 }
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
  const { calendars, selectedCalendar } = useCalendarContext();
  const defaultCalendar = selectedCalendar || calendars.find(cal => cal.is_default) || calendars[0];
  
  const { schedules } = useAvailabilitySchedules(defaultCalendar?.id);
  const defaultSchedule = schedules.find(s => s.is_default) || schedules[0];
  
  const { rules, createRule, updateRule, deleteRule, syncingRules, refetch: refreshRules } = useAvailabilityRules(defaultSchedule?.id);

  // OPTIMIZED: Minimal refresh logic with debouncing
  const prevScheduleIdRef = useRef<string | undefined>();
  const onChangeTimeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    const currentScheduleId = defaultSchedule?.id;
    if (currentScheduleId && currentScheduleId !== prevScheduleIdRef.current) {
      prevScheduleIdRef.current = currentScheduleId;
      
      // Debounce onChange calls to prevent excessive re-renders
      if (onChangeTimeoutRef.current) {
        clearTimeout(onChangeTimeoutRef.current);
      }
      onChangeTimeoutRef.current = setTimeout(() => {
        onChange();
      }, 100);
    }
  }, [defaultSchedule?.id, onChange]);

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
  const [syncMutex, setSyncMutex] = useState<Map<string, boolean>>(new Map());

  // Convert database rules to UI availability format with proper time formatting
  const availabilityFromRules = useMemo(() => {
    const result: Record<string, DayAvailability> = {};
    
    // Helper function to format time from HH:MM:SS to HH:MM
    const formatTime = (time: string) => {
      if (!time) return '08:00';
      return time.length === 5 ? time : time.substring(0, 5);
    };
    
    DAYS.forEach(day => {
      const dayRules = rules.filter(rule => rule.day_of_week === day.dayOfWeek);
      
      if (dayRules.length > 0) {
        const availableRules = dayRules.filter(rule => rule.is_available);
        
        result[day.key] = {
          enabled: availableRules.length > 0,
          timeBlocks: availableRules.length > 0 
            ? availableRules.map((rule, index) => ({
                id: `${day.key}-${index + 1}`,
                startTime: formatTime(rule.start_time),
                endTime: formatTime(rule.end_time)
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

  // PHASE 2: Implement mutex locks and improved sync with cancellation
  const syncToDatabase = async (dayKey: string, dayData: DayAvailability) => {
    if (!defaultSchedule?.id) return;
    
    const day = DAYS.find(d => d.key === dayKey);
    if (!day) return;

    // PHASE 2: Implement mutex lock to prevent concurrent syncs
    if (syncMutex.get(dayKey)) {
      console.log(`Sync already in progress for ${dayKey}, skipping...`);
      return;
    }

    // Clear any existing timeout for this day
    const existingTimeout = syncTimeouts.get(dayKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      syncTimeouts.delete(dayKey);
    }

    // Set mutex lock
    setSyncMutex(prev => new Map(prev).set(dayKey, true));

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

      // PHASE 2: Minimal deletion wait
      await new Promise(resolve => setTimeout(resolve, 50));

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
            
      // PHASE 2: Minimal sync delay
      await new Promise(resolve => setTimeout(resolve, 25));
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
      
      // OPTIMIZED: Immediate refresh without delay
      onChange();
    } catch (error) {
      console.error(`Error syncing ${dayKey} to database:`, error);
      throw error; // Re-throw to let caller handle error
    } finally {
      // PHASE 2: Release mutex lock and clean up
      setSyncMutex(prev => {
        const newMap = new Map(prev);
        newMap.delete(dayKey);
        return newMap;
      });
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

  // PHASE 2: Cleanup timeouts and mutex locks on unmount
  useEffect(() => {
    return () => {
      syncTimeouts.forEach(timeout => clearTimeout(timeout));
      setSyncMutex(new Map());
    };
  }, [syncTimeouts]);

  // Function to create a default schedule
  const createDefaultSchedule = async () => {
    if (!defaultCalendar) {
      console.error('No default calendar available for schedule creation');
      throw new Error('No calendar available');
    }
    
    try {
      console.log('Creating default schedule for calendar:', defaultCalendar.id);
      
      // Verify calendar exists in database before creating schedule
      const { data: calendarCheck, error: calendarError } = await supabase
        .from('calendars')
        .select('id')
        .eq('id', defaultCalendar.id)
        .single();
      
      if (calendarError || !calendarCheck) {
        console.error('Calendar not found in database:', calendarError);
        throw new Error('Calendar not found in database');
      }
      
      const { data, error } = await supabase
        .from('availability_schedules')
        .insert({
          calendar_id: defaultCalendar.id,
          name: 'Default Schedule',
          is_default: true
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating default schedule:', error);
        throw error;
      }
      
      console.log('Default schedule created successfully:', data);
      
      // Longer delay to ensure database sync
      await new Promise(resolve => setTimeout(resolve, 200));
      onChange();
      
      return data;
      
    } catch (error) {
      console.error('Error creating default schedule:', error);
      throw error;
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
    syncToDatabase,
    createDefaultSchedule,
    refreshAvailability: refreshRules
  };
};
