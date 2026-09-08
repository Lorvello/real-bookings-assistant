import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useProfile } from './useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { supabase } from '@/integrations/supabase/client';
import { useBotStatus } from './useBotStatus';
import { useUserStatus } from '@/contexts/UserStatusContext';

export const useOnboardingProgress = () => {
  const { t } = useTranslation('app');
  const { profile } = useProfile();
  const { selectedCalendar, calendars } = useCalendarContext();
  const { accessControl, isLoading: accessLoading } = useUserStatus();
  // No aggregation: services, hours and activation must belong to THIS calendar.
  const calendarId = calendars.find(cal => cal.id === selectedCalendar?.id)?.id;
  const bot = useBotStatus(calendarId);
  const setup = useQuery({
    queryKey: ['onboarding-setup', profile?.id, calendarId],
    enabled: !!profile?.id && !!calendarId,
    staleTime: 0,
    queryFn: async () => {
      const services = await supabase.from('service_types').select('id')
        .eq('calendar_id', calendarId!).eq('is_active', true)
        .or('is_deleted.is.null,is_deleted.eq.false');
      if (services.error) throw services.error;
      const schedules = await supabase.from('availability_schedules').select('id')
        .eq('calendar_id', calendarId!);
      if (schedules.error) throw schedules.error;
      let hasHours = false;
      if (schedules.data?.length) {
        const rules = await supabase.from('availability_rules').select('id')
          .in('schedule_id', schedules.data.map(schedule => schedule.id))
          .eq('is_available', true);
        if (rules.error) throw rules.error;
        hasHours = !!rules.data?.length;
      }
      return { hasServices: !!services.data?.length, hasHours };
    },
  });
  const verifiedSetup = setup.isSuccess && !setup.isError ? setup.data : undefined;
  const setupSteps = [
    { key: 'business_info', completed: !!(profile?.business_name && profile.business_type),
      name: t('app.onboarding.steps.businessInfo.name', 'Business Information'),
      description: t('app.onboarding.steps.businessInfo.description', 'Complete your business profile') },
    { key: 'service_types', completed: !!verifiedSetup?.hasServices,
      name: t('app.onboarding.steps.serviceTypes.name', 'Service Types'),
      description: t('app.onboarding.steps.serviceTypes.description', 'Add your services and pricing') },
    { key: 'calendar_creation', completed: !!profile?.id && !!calendarId,
      name: t('app.onboarding.steps.calendarCreation.name', 'Create Your Calendar'),
      description: t('app.onboarding.steps.calendarCreation.description', 'Set up your booking calendar') },
    { key: 'availability', completed: !!verifiedSetup?.hasHours,
      name: t('app.onboarding.steps.availability.name', 'Availability'),
      description: t('app.onboarding.steps.availability.description', 'Set your working hours') },
  ];
  // Four setup requirements still unlock the trial; activation never gates that RPC.
  const setupComplete = setupSteps.every(step => step.completed);
  const allSteps = [...setupSteps, {
    key: 'bot_activation',
    completed: setupComplete && bot.ready && bot.data?.whatsapp_bot_active === true
      && !accessLoading && accessControl.canAccessWhatsApp,
    name: t('app.onboarding.steps.botActivation.name', 'Activate your assistant'),
    description: t('app.onboarding.steps.botActivation.description', 'Review and activate WhatsApp for the selected calendar'),
  }];
  const completedSteps = allSteps.filter(step => step.completed).length;
  return {
    completionPercentage: Math.round(completedSteps / allSteps.length * 100),
    completedSteps,
    totalSteps: allSteps.length,
    nextSteps: allSteps.filter(step => !step.completed).slice(0, 3),
    allSteps,
    setupComplete,
    isLoading: setup.isLoading || bot.isLoading,
    isError: setup.isError || bot.isError,
  };
};
