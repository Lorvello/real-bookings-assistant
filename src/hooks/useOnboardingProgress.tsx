import { useMemo } from 'react';
import { useProfile } from './useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';

export const useOnboardingProgress = () => {
  const { profile } = useProfile();
  const { selectedCalendar } = useCalendarContext();

  const progress = useMemo(() => {
    if (!profile) {
      return {
        completionPercentage: 0,
        completedSteps: 0,
        totalSteps: 5,
        nextSteps: []
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
        completed: false, // Would need to check if user has service types
        name: 'Service Types',
        description: 'Add your services and pricing'
      },
      {
        key: 'availability',
        completed: false, // Would need to check if user has availability rules
        name: 'Availability',
        description: 'Set your working hours'
      },
      {
        key: 'booking_settings',
        completed: false, // Would need to check if user has configured booking settings
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
  }, [profile, selectedCalendar]);

  return progress;
};