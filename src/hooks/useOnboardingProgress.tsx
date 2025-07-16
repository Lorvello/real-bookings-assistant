import { useMemo, useState, useEffect } from 'react';
import { useProfile } from './useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { supabase } from '@/integrations/supabase/client';
import { useUserStatus } from '@/contexts/UserStatusContext';

export const useOnboardingProgress = () => {
  const { profile } = useProfile();
  const { selectedCalendar } = useCalendarContext();
  const { userStatus, invalidateCache } = useUserStatus();
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

        // Check availability rules via availability_schedules
        const { data: availabilityRules } = await supabase
          .from('availability_rules')
          .select('id, schedule_id')
          .in('schedule_id', 
            (await supabase
              .from('availability_schedules')
              .select('id')
              .eq('calendar_id', selectedCalendar.id)
            ).data?.map(schedule => schedule.id) || []
          );
        
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

  // Check if setup is complete and automatically progress user status
  useEffect(() => {
    if (!profile?.id || userStatus.userType !== 'setup_incomplete') return;
    
    const isBusinessInfoComplete = !!(profile.business_name && profile.business_type);
    const isServiceTypesComplete = serviceTypeCount > 0;
    const isAvailabilityComplete = availabilityRulesCount > 0;
    
    // If all 3 steps are complete, automatically progress to active trial
    if (isBusinessInfoComplete && isServiceTypesComplete && isAvailabilityComplete) {
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
  }, [profile?.id, profile?.business_name, profile?.business_type, serviceTypeCount, availabilityRulesCount, userStatus.userType, invalidateCache]);

  const progress = useMemo(() => {
    if (!profile) {
      return {
        completionPercentage: 0,
        completedSteps: 0,
        totalSteps: 3,
        nextSteps: [],
        allSteps: []
      };
    }

    // SIMPLIFIED: Only 3 essential steps
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
  }, [profile, selectedCalendar, serviceTypeCount, availabilityRulesCount, bookingSettingsConfigured]);

  return progress;
};