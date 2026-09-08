import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserStatus } from '@/contexts/UserStatusContext';

interface BotStatus {
  calendar_id: string;
  whatsapp_bot_active: boolean;
  last_bot_activity?: string;
}

export function useBotStatus(calendarId?: string) {
  const { t } = useTranslation('notifications');
  const { user } = useAuth();
  const { accessControl, isLoading: accessLoading } = useUserStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ['bot-status', user?.id, calendarId];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<BotStatus> => {
      const { data, error } = await supabase.from('calendar_settings')
        .select('calendar_id, whatsapp_bot_active, last_bot_activity')
        .eq('calendar_id', calendarId!).single();
      if (error) throw error;
      if (!data || data.calendar_id !== calendarId || typeof data.whatsapp_bot_active !== 'boolean') {
        throw new Error('Calendar bot settings could not be verified');
      }
      return data;
    },
    enabled: !!calendarId && !!user?.id,
    staleTime: 0,
  });

  const toggleBotMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!calendarId || !user?.id || !query.isSuccess || query.isError || !query.data) {
        throw new Error('Verified calendar settings required');
      }
      if (isActive && (accessLoading || !accessControl.canAccessWhatsApp)) {
        throw new Error('WhatsApp access required');
      }
      // Do not create settings as a side effect of activation. RLS protects the
      // selected row; returning exactly one matching row proves the write happened.
      const { data, error } = await supabase.from('calendar_settings')
        .update({ whatsapp_bot_active: isActive })
        .eq('calendar_id', calendarId)
        .select('calendar_id, whatsapp_bot_active, last_bot_activity').single();
      if (error) throw error;
      if (!data || data.calendar_id !== calendarId || data.whatsapp_bot_active !== isActive) {
        throw new Error('Bot status was not saved for this calendar');
      }
      return { data, ownerId: user.id, calendarId };
    },
    onSuccess: async ({ data, ownerId, calendarId: savedCalendarId }) => {
      // Bind completion to the initiating tenant/calendar even if selection changed.
      const savedQueryKey = ['bot-status', ownerId, savedCalendarId];
      // A refetch begun before/during the write may still carry the old value.
      // Cancel its cache delivery before publishing the confirmed returned row.
      await queryClient.cancelQueries({ queryKey: savedQueryKey, exact: true });
      queryClient.setQueryData(savedQueryKey, data);
      queryClient.invalidateQueries({ queryKey: ['calendar-settings', savedCalendarId] });
      queryClient.invalidateQueries({ queryKey: ['global-bot-status'] });
      toast({
        title: data.whatsapp_bot_active
          ? t('botStatus.activatedTitle', 'WhatsApp bot activated')
          : t('botStatus.pausedTitle', 'WhatsApp bot paused'),
        description: t('botStatus.savedForCalendar', 'The setting has been saved for this calendar.'),
      });
    },
    onError: () => {
      toast({
        title: t('botStatus.errorTitle', 'Error changing bot status'),
        description: t('botStatus.saveFailed', 'The setting could not be saved. Check the status and try again.'),
        variant: 'destructive',
      });
    },
  });

  return {
    data: query.isError || !user?.id || !calendarId ? undefined : query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    ready: !!user?.id && !!calendarId && query.isSuccess && !query.isError,
    refetch: query.refetch,
    toggleBot: toggleBotMutation.mutate,
    isToggling: toggleBotMutation.isPending,
    saveError: toggleBotMutation.isError,
  };
}
