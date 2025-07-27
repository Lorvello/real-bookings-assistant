import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useToast } from '@/hooks/use-toast';
import type { 
  AvailabilityState, 
  AvailabilitySchedule, 
  WeeklySchedule, 
  AvailabilityOverride,
  DayAvailability
} from '@/types/availability';
import { DAYS_OF_WEEK } from '@/types/availability';

const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: { enabled: true, timeBlocks: [{ id: 'monday-1', startTime: '09:00', endTime: '17:00' }] },
  tuesday: { enabled: true, timeBlocks: [{ id: 'tuesday-1', startTime: '09:00', endTime: '17:00' }] },
  wednesday: { enabled: true, timeBlocks: [{ id: 'wednesday-1', startTime: '09:00', endTime: '17:00' }] },
  thursday: { enabled: true, timeBlocks: [{ id: 'thursday-1', startTime: '09:00', endTime: '17:00' }] },
  friday: { enabled: true, timeBlocks: [{ id: 'friday-1', startTime: '09:00', endTime: '17:00' }] },
  saturday: { enabled: false, timeBlocks: [{ id: 'saturday-1', startTime: '09:00', endTime: '17:00' }] },
  sunday: { enabled: false, timeBlocks: [{ id: 'sunday-1', startTime: '09:00', endTime: '17:00' }] },
};

export const useAvailabilityManager = () => {
  const { selectedCalendar } = useCalendarContext();
  const { toast } = useToast();

  const [state, setState] = useState<AvailabilityState>({
    schedule: null,
    weeklySchedule: DEFAULT_SCHEDULE,
    overrides: [],
    timezone: selectedCalendar?.timezone || 'UTC',
    loading: false,
    saving: false,
    error: null,
  });

  // Fetch availability data
  const fetchAvailability = useCallback(async () => {
    if (!selectedCalendar?.id) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch schedule and rules
      const { data: schedules, error: scheduleError } = await supabase
        .from('availability_schedules')
        .select(`
          *,
          availability_rules (*)
        `)
        .eq('calendar_id', selectedCalendar.id)
        .eq('is_default', true);

      if (scheduleError) throw scheduleError;

      // Fetch overrides
      const { data: overrides, error: overridesError } = await supabase
        .from('availability_overrides')
        .select('*')
        .eq('calendar_id', selectedCalendar.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date');

      if (overridesError) throw overridesError;

      const schedule = schedules?.[0] || null;
      const weeklySchedule = schedule ? convertRulesToWeeklySchedule(schedule.availability_rules || []) : DEFAULT_SCHEDULE;

      setState(prev => ({
        ...prev,
        schedule,
        weeklySchedule,
        overrides: overrides || [],
        timezone: selectedCalendar.timezone,
        loading: false,
      }));

    } catch (error) {
      console.error('Error fetching availability:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load availability',
      }));
    }
  }, [selectedCalendar?.id, selectedCalendar?.timezone]);

  // Convert database rules to weekly schedule format
  const convertRulesToWeeklySchedule = useCallback((rules: any[]): WeeklySchedule => {
    const schedule = { ...DEFAULT_SCHEDULE };
    
    rules.forEach(rule => {
      const dayKey = getDayKeyFromIndex(rule.day_of_week);
      if (dayKey) {
        schedule[dayKey] = {
          enabled: rule.is_available,
          timeBlocks: rule.is_available ? [{
            id: `${dayKey}-${rule.id}`,
            startTime: rule.start_time,
            endTime: rule.end_time,
          }] : [],
        };
      }
    });

    return schedule;
  }, []);

  // Helper to get day key from index
  const getDayKeyFromIndex = (index: number): string | null => {
    const day = DAYS_OF_WEEK.find(d => d.index === index);
    return day?.key || null;
  };

  // Save weekly schedule
  const saveWeeklySchedule = useCallback(async (weeklySchedule: WeeklySchedule) => {
    if (!selectedCalendar?.id) return false;

    setState(prev => ({ ...prev, saving: true, error: null }));

    try {
      // Ensure default schedule exists
      let scheduleId = state.schedule?.id;
      
      if (!scheduleId) {
        const { data: newSchedule, error: scheduleError } = await supabase
          .from('availability_schedules')
          .insert({
            calendar_id: selectedCalendar.id,
            name: 'Default Schedule',
            is_default: true,
          })
          .select()
          .single();

        if (scheduleError) throw scheduleError;
        scheduleId = newSchedule.id;
      }

      // Delete existing rules
      const { error: deleteError } = await supabase
        .from('availability_rules')
        .delete()
        .eq('schedule_id', scheduleId);

      if (deleteError) throw deleteError;

      // Create new rules
      const rules = Object.entries(weeklySchedule).flatMap(([dayKey, dayData]) => {
        const dayIndex = DAYS_OF_WEEK.find(d => d.key === dayKey)?.index;
        if (!dayIndex) return [];

        if (!dayData.enabled || dayData.timeBlocks.length === 0) {
          return [{
            schedule_id: scheduleId,
            day_of_week: dayIndex,
            start_time: '09:00',
            end_time: '17:00',
            is_available: false,
          }];
        }

        return dayData.timeBlocks.map(block => ({
          schedule_id: scheduleId,
          day_of_week: dayIndex,
          start_time: block.startTime,
          end_time: block.endTime,
          is_available: true,
        }));
      });

      const { error: insertError } = await supabase
        .from('availability_rules')
        .insert(rules);

      if (insertError) throw insertError;

      setState(prev => ({
        ...prev,
        weeklySchedule,
        saving: false,
      }));

      toast({
        title: "Schedule Updated",
        description: "Your availability schedule has been saved successfully.",
      });

      return true;

    } catch (error) {
      console.error('Error saving schedule:', error);
      setState(prev => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to save schedule',
      }));

      toast({
        title: "Save Failed",
        description: "Failed to save your schedule. Please try again.",
        variant: "destructive",
      });

      return false;
    }
  }, [selectedCalendar?.id, state.schedule?.id, toast]);

  // Update day availability
  const updateDayAvailability = useCallback((dayKey: string, dayData: DayAvailability) => {
    setState(prev => ({
      ...prev,
      weeklySchedule: {
        ...prev.weeklySchedule,
        [dayKey]: dayData,
      },
    }));
  }, []);

  // Add time block to day
  const addTimeBlock = useCallback((dayKey: string) => {
    setState(prev => {
      const currentDay = prev.weeklySchedule[dayKey];
      const newBlock = {
        id: `${dayKey}-${Date.now()}`,
        startTime: '09:00',
        endTime: '17:00',
      };

      return {
        ...prev,
        weeklySchedule: {
          ...prev.weeklySchedule,
          [dayKey]: {
            ...currentDay,
            timeBlocks: [...currentDay.timeBlocks, newBlock],
          },
        },
      };
    });
  }, []);

  // Remove time block from day
  const removeTimeBlock = useCallback((dayKey: string, blockId: string) => {
    setState(prev => {
      const currentDay = prev.weeklySchedule[dayKey];
      
      return {
        ...prev,
        weeklySchedule: {
          ...prev.weeklySchedule,
          [dayKey]: {
            ...currentDay,
            timeBlocks: currentDay.timeBlocks.filter(block => block.id !== blockId),
          },
        },
      };
    });
  }, []);

  // Check if setup is complete
  const isSetupComplete = useCallback(() => {
    return !!state.schedule && Object.values(state.weeklySchedule).some(day => day.enabled);
  }, [state.schedule, state.weeklySchedule]);

  // Load data when calendar changes
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  return {
    ...state,
    fetchAvailability,
    saveWeeklySchedule,
    updateDayAvailability,
    addTimeBlock,
    removeTimeBlock,
    isSetupComplete: isSetupComplete(),
  };
};