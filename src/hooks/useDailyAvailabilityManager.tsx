
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

  // Sync function with debouncing
  const syncToDatabase = async (dayKey: string, dayData: DayAvailability) => {
    if (!defaultSchedule?.id) return;
    
    const day = DAYS.find(d => d.key === dayKey);
    if (!day) return;

    const updateId = `${dayKey}-${Date.now()}`;
    setPendingUpdates(prev => new Set(prev).add(updateId));

    try {
      const existingRules = rules.filter(rule => rule.day_of_week === day.dayOfWeek);
      
      const deletePromises = existingRules.map(rule => deleteRule(rule.id));
      await Promise.all(deletePromises);

      if (dayData.enabled && dayData.timeBlocks.length > 0) {
        const createPromises = dayData.timeBlocks.map(timeBlock => 
          createRule({
            day_of_week: day.dayOfWeek,
            start_time: timeBlock.startTime,
            end_time: timeBlock.endTime,
            is_available: true
          })
        );
        await Promise.all(createPromises);
      } else {
        await createRule({
          day_of_week: day.dayOfWeek,
          start_time: '09:00',
          end_time: '17:00',
          is_available: false
        });
      }
      
      onChange();
    } catch (error) {
      console.error('Error syncing to database:', error);
    } finally {
      setPendingUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(updateId);
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
