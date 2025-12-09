import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCalendars } from '@/hooks/useCalendars';

interface AvailabilityAlert {
  calendarId: string;
  calendarName: string;
  hasSchedule: boolean;
  hasRules: boolean;
}

export const useAvailabilityAlerts = () => {
  const { calendars, loading: calendarsLoading } = useCalendars();
  const [alerts, setAlerts] = useState<AvailabilityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAvailability = async () => {
      if (calendarsLoading || calendars.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const calendarAlerts: AvailabilityAlert[] = [];

        for (const calendar of calendars) {
          // Check for availability schedules
          const { data: schedules } = await supabase
            .from('availability_schedules')
            .select('id')
            .eq('calendar_id', calendar.id)
            .limit(1);

          const hasSchedule = (schedules?.length ?? 0) > 0;

          // If there's a schedule, check for rules
          let hasRules = false;
          if (hasSchedule && schedules?.[0]) {
            const { data: rules } = await supabase
              .from('availability_rules')
              .select('id')
              .eq('schedule_id', schedules[0].id)
              .limit(1);
            
            hasRules = (rules?.length ?? 0) > 0;
          }

          // Calendar needs setup if no schedule OR no rules
          if (!hasSchedule || !hasRules) {
            calendarAlerts.push({
              calendarId: calendar.id,
              calendarName: calendar.name || 'Unnamed Calendar',
              hasSchedule,
              hasRules
            });
          }
        }

        setAlerts(calendarAlerts);
      } catch (error) {
        console.error('Error checking availability alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAvailability();
  }, [calendars, calendarsLoading]);

  const hasAlerts = useMemo(() => alerts.length > 0, [alerts]);
  const alertCount = useMemo(() => alerts.length, [alerts]);

  return {
    alerts,
    hasAlerts,
    alertCount,
    loading
  };
};
