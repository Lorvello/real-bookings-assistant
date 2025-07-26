
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

export const useDailyAvailabilityManager = (onChange: () => void, calendarId?: string) => {
  const { calendars, selectedCalendar } = useCalendarContext();
  
  // Use provided calendarId or fall back to context selection
  const targetCalendarId = calendarId || selectedCalendar?.id;
  const defaultCalendar = calendars.find(cal => cal.id === targetCalendarId) || selectedCalendar || calendars.find(cal => cal.is_default) || calendars[0];
  
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

  // IMPROVED: Direct database sync with proper error handling and validation
  const syncToDatabase = async (dayKey: string, dayData: DayAvailability, scheduleOverride?: { id: string }) => {
    const targetSchedule = scheduleOverride || defaultSchedule;
    
    if (!targetSchedule?.id) {
      console.error('❌ Cannot sync to database: no schedule available');
      throw new Error('No schedule available for saving availability');
    }
    
    const day = DAYS.find(d => d.key === dayKey);
    if (!day) {
      console.error(`❌ Cannot sync to database: day not found for key ${dayKey}`);
      throw new Error(`Invalid day key: ${dayKey}`);
    }

    console.log(`🔄 Syncing ${dayKey} to database:`, dayData);
    console.log(`📝 Using schedule_id: ${targetSchedule.id}, day_of_week: ${day.dayOfWeek}`);

    try {
      // STEP 1: Delete existing rules for this day
      console.log(`🗑️ Deleting existing rules for ${dayKey} (day ${day.dayOfWeek})`);
      const { error: deleteError } = await supabase
        .from('availability_rules')
        .delete()
        .eq('schedule_id', targetSchedule.id)
        .eq('day_of_week', day.dayOfWeek);

      if (deleteError) {
        console.error('❌ Error deleting old rules:', deleteError);
        throw new Error(`Failed to delete existing rules for ${dayKey}: ${deleteError.message}`);
      }

      // STEP 2: Create new rules based on availability
      const rulesToCreate = [];
      
      if (dayData.enabled && dayData.timeBlocks.length > 0) {
        console.log(`✅ Creating ${dayData.timeBlocks.length} available time blocks for ${dayKey}`);
        for (const timeBlock of dayData.timeBlocks) {
          // Validate time format and logic
          if (!timeBlock.startTime || !timeBlock.endTime) {
            console.warn(`⚠️ Skipping invalid time block for ${dayKey}: missing times`);
            continue;
          }
          
          if (timeBlock.startTime >= timeBlock.endTime) {
            console.warn(`⚠️ Skipping invalid time block for ${dayKey}: ${timeBlock.startTime} >= ${timeBlock.endTime}`);
            continue;
          }

          rulesToCreate.push({
            schedule_id: targetSchedule.id,
            day_of_week: day.dayOfWeek,
            start_time: timeBlock.startTime,
            end_time: timeBlock.endTime,
            is_available: true
          });
        }
      } else {
        console.log(`❌ Creating unavailable rule for ${dayKey} (disabled day)`);
        rulesToCreate.push({
          schedule_id: targetSchedule.id,
          day_of_week: day.dayOfWeek,
          start_time: '09:00',
          end_time: '17:00',
          is_available: false
        });
      }

      // STEP 3: Insert all rules at once
      if (rulesToCreate.length > 0) {
        console.log(`📝 Inserting ${rulesToCreate.length} rules for ${dayKey}:`, rulesToCreate);
        
        const { data, error: insertError } = await supabase
          .from('availability_rules')
          .insert(rulesToCreate)
          .select();

        if (insertError) {
          console.error('❌ Error creating rules:', insertError);
          throw new Error(`Failed to create rules for ${dayKey}: ${insertError.message}`);
        }

        console.log(`✅ Successfully created ${data?.length || 0} rules for ${dayKey}`);
      }
      
      console.log(`✅ Sync completed successfully for ${dayKey}`);
      
    } catch (error) {
      console.error(`❌ Error syncing ${dayKey} to database:`, error);
      throw error;
    }
  };

  // PHASE 2: Cleanup timeouts and mutex locks on unmount
  useEffect(() => {
    return () => {
      syncTimeouts.forEach(timeout => clearTimeout(timeout));
      setSyncMutex(new Map());
    };
  }, [syncTimeouts]);

  // PHASE 2: Improved schedule creation with better error handling and verification
  const createDefaultSchedule = async () => {
    if (!defaultCalendar) {
      console.error('No default calendar available for schedule creation');
      throw new Error('No calendar available');
    }
    
    try {
      console.log('Creating default schedule for calendar:', defaultCalendar.id);
      
      // PHASE 2: Enhanced calendar verification with retry
      let calendarCheck = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && !calendarCheck) {
        const { data, error } = await supabase
          .from('calendars')
          .select('id')
          .eq('id', defaultCalendar.id)
          .single();
        
        if (error) {
          console.warn(`Calendar check attempt ${retryCount + 1} failed:`, error);
          retryCount++;
          
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            throw new Error(`Calendar not found after ${maxRetries} attempts`);
          }
        } else {
          calendarCheck = data;
        }
      }
      
      // Check if schedule already exists
      const { data: existingSchedule } = await supabase
        .from('availability_schedules')
        .select('id')
        .eq('calendar_id', defaultCalendar.id)
        .eq('is_default', true)
        .single();
      
      if (existingSchedule) {
        console.log('Default schedule already exists:', existingSchedule.id);
        return existingSchedule;
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
      
      // OPTIMIZED: Immediate refresh for fast UI updates
      await refreshRules();
      onChange();
      
      return data;
      
    } catch (error) {
      console.error('Error creating default schedule:', error);
      throw error;
    }
  };

  // OPTIMIZED: Fast refresh for immediate UI updates after guided setup
  const forceRefresh = async () => {
    console.log('🔄 Force refreshing availability data...');
    
    try {
      // OPTIMIZED: Minimal delay for database operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Directly fetch fresh data from database
      await refreshRules();
      
      // OPTIMIZED: Reduced settle time for faster UI response
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Trigger dependent updates
      onChange();
      
      console.log('✅ Fast refresh completed successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
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
    refreshAvailability: refreshRules,
    forceRefresh
  };
};
