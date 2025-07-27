import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DayAvailability {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface SimpleAvailabilityData {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
  timezone: string;
}

const defaultDay: DayAvailability = {
  enabled: false,
  startTime: '09:00',
  endTime: '17:00'
};

const defaultAvailability: SimpleAvailabilityData = {
  monday: defaultDay,
  tuesday: defaultDay,
  wednesday: defaultDay,
  thursday: defaultDay,
  friday: defaultDay,
  saturday: defaultDay,
  sunday: defaultDay,
  timezone: 'Europe/Amsterdam'
};

export const useSimpleAvailability = (calendarId?: string) => {
  const { toast } = useToast();
  const [availability, setAvailability] = useState<SimpleAvailabilityData>(defaultAvailability);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAvailability = async () => {
    if (!calendarId) return;
    
    setLoading(true);
    try {
      // Get default schedule
      const { data: schedules } = await supabase
        .from('availability_schedules')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('is_default', true);

      if (!schedules?.length) {
        setLoading(false);
        return;
      }

      // Get rules for default schedule
      const { data: rules } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('schedule_id', schedules[0].id);

      // Get calendar timezone
      const { data: calendar } = await supabase
        .from('calendars')
        .select('timezone')
        .eq('id', calendarId)
        .single();

      // Convert rules to simple format
      const newAvailability = { ...defaultAvailability };
      if (calendar?.timezone) {
        newAvailability.timezone = calendar.timezone;
      }

      const dayMap: { [key: number]: keyof SimpleAvailabilityData } = {
        1: 'monday',
        2: 'tuesday', 
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday',
        7: 'sunday'
      };

      rules?.forEach(rule => {
        const dayKey = dayMap[rule.day_of_week];
        if (dayKey && dayKey !== 'timezone') {
          newAvailability[dayKey] = {
            enabled: rule.is_available,
            startTime: rule.start_time,
            endTime: rule.end_time
          };
        }
      });

      setAvailability(newAvailability);
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAvailability = async () => {
    if (!calendarId) return false;

    setSaving(true);
    try {
      // Update calendar timezone
      await supabase
        .from('calendars')
        .update({ timezone: availability.timezone })
        .eq('id', calendarId);

      // Get or create default schedule
      let scheduleId: string;
      const { data: existingSchedules } = await supabase
        .from('availability_schedules')
        .select('id')
        .eq('calendar_id', calendarId)
        .eq('is_default', true);

      if (existingSchedules?.length) {
        scheduleId = existingSchedules[0].id;
      } else {
        const { data: newSchedule } = await supabase
          .from('availability_schedules')
          .insert({
            calendar_id: calendarId,
            name: 'Default Schedule',
            is_default: true
          })
          .select('id')
          .single();
        
        if (!newSchedule) throw new Error('Failed to create schedule');
        scheduleId = newSchedule.id;
      }

      // Delete existing rules
      await supabase
        .from('availability_rules')
        .delete()
        .eq('schedule_id', scheduleId);

      // Insert new rules
      const dayMap: { [key: string]: number } = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 7
      };

      const rulesToInsert = Object.entries(availability)
        .filter(([key]) => key !== 'timezone')
        .map(([day, config]) => ({
          schedule_id: scheduleId,
          day_of_week: dayMap[day],
          start_time: config.startTime,
          end_time: config.endTime,
          is_available: config.enabled
        }));

      await supabase
        .from('availability_rules')
        .insert(rulesToInsert);

      toast({
        title: "Availability saved",
        description: "Your availability has been updated successfully.",
      });

      return true;
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({
        title: "Error",
        description: "Failed to save availability. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, [calendarId]);

  return {
    availability,
    setAvailability,
    loading,
    saving,
    saveAvailability,
    refreshAvailability: loadAvailability
  };
};