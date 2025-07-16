import { useMemo, useState, useEffect } from 'react';
import { useProfile } from './useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { supabase } from '@/integrations/supabase/client';

export const useOnboardingProgress = () => {
  const { profile } = useProfile();
  const { selectedCalendar } = useCalendarContext();
  const [serviceTypeCount, setServiceTypeCount] = useState(0);
  const [availabilityRulesCount, setAvailabilityRulesCount] = useState(0);
  const [bookingSettingsConfigured, setBookingSettingsConfigured] = useState(false);

  // Fetch additional onboarding data
  useEffect(() => {
    const fetchOnboardingData = async () => {
      if (!profile?.id || !selectedCalendar) return;

      try {
        // Check service types
        const { data: serviceTypes } = await supabase
          .from('service_types')
          .select('id')
          .eq('calendar_id', selectedCalendar.id)
          .eq('is_active', true);
        
        setServiceTypeCount(serviceTypes?.length || 0);

        // Check availability rules
        const { data: availabilityRules } = await supabase
          .from('availability_rules')
          .select('id')
          .eq('schedule_id', selectedCalendar.id); // This might need adjustment based on your schema
        
        setAvailabilityRulesCount(availabilityRules?.length || 0);

        // Check booking settings
        const { data: bookingSettings } = await supabase
          .from('calendar_settings')
          .select('id')
          .eq('calendar_id', selectedCalendar.id);
        
        setBookingSettingsConfigured(!!bookingSettings && bookingSettings.length > 0);
      } catch (error) {
        console.error('Error fetching onboarding data:', error);
      }
    };

    fetchOnboardingData();
  }, [profile?.id, selectedCalendar?.id]);

  const progress = useMemo(() => {
    if (!profile) {
      return {
        completionPercentage: 0,
        completedSteps: 0,
        totalSteps: 5,
        nextSteps: [],
        allSteps: []
      };
    }

    const steps = [
      {
        key: 'business_info',
        completed: !!(profile.business_name && profile.business_type),
        name: 'Business Information',
        description: 'Complete your business profile'
      },
      {
        key: 'calendar_setup',
        completed: !!selectedCalendar,
        name: 'Calendar Setup',
        description: 'Set up your first calendar'
      },
      {
        key: 'service_types',
        completed: serviceTypeCount > 0,
        name: 'Service Types',
        description: 'Add your services and pricing'
      },
      {
        key: 'availability',
        completed: availabilityRulesCount > 0,
        name: 'Availability',
        description: 'Set your working hours'
      },
      {
        key: 'booking_settings',
        completed: bookingSettingsConfigured,
        name: 'Booking Settings',
        description: 'Configure booking preferences'
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
  }, [profile, selectedCalendar, serviceTypeCount, availabilityRulesCount, bookingSettingsConfigured]);

  return progress;
};