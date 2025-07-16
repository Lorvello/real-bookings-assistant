import { useMemo, useState, useEffect } from 'react';
import { useProfile } from './useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { supabase } from '@/integrations/supabase/client';
import { useUserStatus } from '@/contexts/UserStatusContext';

export const useOnboardingProgress = () => {
  const { profile } = useProfile();
  const { selectedCalendar, calendars } = useCalendarContext();
  const { userStatus, invalidateCache } = useUserStatus();
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

  // Check if setup is complete and automatically progress user status
  useEffect(() => {
    if (!profile?.id || userStatus.userType !== 'setup_incomplete') return;
    
    const isBusinessInfoComplete = !!(profile.business_name && profile.business_type);
    const isServiceTypesComplete = serviceTypeCount > 0;
    const isCalendarCreated = calendars.length > 0;
    const isAvailabilityComplete = availabilityRulesCount > 0;
    
    // If all 4 steps are complete, automatically progress to active trial
    if (isBusinessInfoComplete && isServiceTypesComplete && isCalendarCreated && isAvailabilityComplete) {
      const progressToActiveTrial = async () => {
        try {
          // Update user status to active trial
          const { error } = await supabase
            .from('users')
            .update({
              subscription_status: 'trial',
              trial_start_date: new Date().toISOString(),
              trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
            })
            .eq('id', profile.id);
          
          if (error) {
            console.error('Error updating user status:', error);
            return;
          }
          
          // Invalidate cache and update status
          invalidateCache('active_trial');
          
          console.log('Setup completed! User status automatically progressed to active trial.');
        } catch (error) {
          console.error('Error progressing user status:', error);
        }
      };
      
      progressToActiveTrial();
    }
  }, [profile?.id, profile?.business_name, profile?.business_type, serviceTypeCount, calendars.length, availabilityRulesCount, userStatus.userType, invalidateCache]);

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