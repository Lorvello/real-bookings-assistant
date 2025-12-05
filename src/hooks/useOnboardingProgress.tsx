import { useMemo, useState, useEffect } from 'react';
import { useProfile } from './useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { supabase } from '@/integrations/supabase/client';

export const useOnboardingProgress = () => {
  const { profile } = useProfile();
  const { selectedCalendar, calendars } = useCalendarContext();
  const [serviceTypeCount, setServiceTypeCount] = useState(0);
  const [availabilityRulesCount, setAvailabilityRulesCount] = useState(0);
  const [bookingSettingsConfigured, setBookingSettingsConfigured] = useState(false);

  // Fetch additional onboarding data
  useEffect(() => {
    const fetchOnboardingData = async () => {
      if (!profile?.id) return;

      try {
        // Check service types for any calendar the user owns
        if (calendars.length > 0) {
          const { data: serviceTypes } = await supabase
            .from('service_types')
            .select('id, calendar_id')
            .in('calendar_id', calendars.map(cal => cal.id))
            .eq('is_active', true);
          
          setServiceTypeCount(serviceTypes?.length || 0);
        } else {
          setServiceTypeCount(0);
        }

        // Check availability rules for any calendar the user owns
        if (calendars.length > 0) {
          const { data: availabilitySchedules } = await supabase
            .from('availability_schedules')
            .select('id')
            .in('calendar_id', calendars.map(cal => cal.id));
          
          if (availabilitySchedules && availabilitySchedules.length > 0) {
            const { data: availabilityRules } = await supabase
              .from('availability_rules')
              .select('id')
              .in('schedule_id', availabilitySchedules.map(schedule => schedule.id));
            
            setAvailabilityRulesCount(availabilityRules?.length || 0);
          } else {
            setAvailabilityRulesCount(0);
          }
        } else {
          setAvailabilityRulesCount(0);
        }

        // Check booking settings for any calendar the user owns
        if (calendars.length > 0) {
          const { data: bookingSettings } = await supabase
            .from('calendar_settings')
            .select('id')
            .in('calendar_id', calendars.map(cal => cal.id));
          
          setBookingSettingsConfigured(!!bookingSettings && bookingSettings.length > 0);
        } else {
          setBookingSettingsConfigured(false);
        }
      } catch (error) {
        console.error('Error fetching onboarding data:', error);
      }
    };

    fetchOnboardingData();
  }, [profile?.id, calendars]);

  // NOTE: Auto-promotion logic has been REMOVED.
  // The database RPC function `get_user_status_type` now handles status determination
  // by checking all 4 setup requirements (business info, calendar, services, availability).
  // This prevents race conditions and ensures consistent status across the app.
  // Status only changes when the user completes ALL setup steps AND the database is queried.

  const progress = useMemo(() => {
    if (!profile) {
      return {
        completionPercentage: 0,
        completedSteps: 0,
        totalSteps: 4,
        nextSteps: [],
        allSteps: []
      };
    }

    // Updated to 4 essential steps
    const steps = [
      {
        key: 'business_info',
        completed: !!(profile.business_name && profile.business_type),
        name: 'Business Information',
        description: 'Complete your business profile'
      },
      {
        key: 'service_types',
        completed: serviceTypeCount > 0,
        name: 'Service Types',
        description: 'Add your services and pricing'
      },
      {
        key: 'calendar_creation',
        completed: calendars.length > 0,
        name: 'Create Your Calendar',
        description: 'Set up your booking calendar'
      },
      {
        key: 'availability',
        completed: availabilityRulesCount > 0,
        name: 'Availability',
        description: 'Set your working hours'
      }
    ];

    const completedSteps = steps.filter(step => step.completed).length;
    const completionPercentage = Math.round((completedSteps / steps.length) * 100);
    const nextSteps = steps.filter(step => !step.completed).slice(0, 3);

    return {
      completionPercentage,
      completedSteps,
      totalSteps: steps.length,
      nextSteps,
      allSteps: steps
    };
  }, [profile, selectedCalendar, calendars.length, serviceTypeCount, availabilityRulesCount, bookingSettingsConfigured]);

  return progress;
};