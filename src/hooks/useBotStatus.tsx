
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BotStatus {
  whatsapp_bot_active: boolean;
  last_bot_activity?: string;
}

export function useBotStatus(calendarId?: string) {
  const { t } = useTranslation('notifications');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['bot-status', calendarId],
    queryFn: async (): Promise<BotStatus | null> => {
      if (!calendarId) return null;

      const { data, error } = await supabase
        .from('calendar_settings')
        .select('whatsapp_bot_active, last_bot_activity')
        .eq('calendar_id', calendarId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!calendarId,
    staleTime: 60000, // 1 minute
  });

  const toggleBotMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!calendarId) throw new Error('Calendar ID required');

      // Upsert: a plain .update() affects 0 rows (and reports success) when the
      // calendar_settings row is missing — the bot toggle would silently do nothing.
      const { error } = await supabase
        .from('calendar_settings')
        .upsert({
          calendar_id: calendarId,
          whatsapp_bot_active: isActive,
          last_bot_activity: isActive ? new Date().toISOString() : undefined
        }, { onConflict: 'calendar_id' });

      if (error) throw error;
      return isActive;
    },
    onSuccess: (isActive) => {
      queryClient.invalidateQueries({ queryKey: ['bot-status', calendarId] });
      
      toast({
        title: isActive
          ? t('botStatus.activatedTitle', 'WhatsApp bot activated')
          : t('botStatus.pausedTitle', 'WhatsApp bot paused'),
        description: isActive
          ? t('botStatus.activatedDescription', 'Your bot is now active and responding to messages')
          : t('botStatus.pausedDescription', 'Your bot is paused'),
      });
    },
    onError: (error) => {
      toast({
        title: t('botStatus.errorTitle', 'Error changing bot status'),
        description: error instanceof Error ? error.message : t('botStatus.unknownError', 'Unknown error'),
        variant: "destructive",
      });
    },
  });

  return {
    data,
    isLoading,
    toggleBot: toggleBotMutation.mutate,
    isToggling: toggleBotMutation.isPending,
  };
}
