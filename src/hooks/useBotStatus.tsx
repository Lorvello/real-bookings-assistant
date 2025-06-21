
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BotStatus {
  whatsapp_bot_active: boolean;
  last_bot_activity?: string;
}

export function useBotStatus(calendarId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bot-status', calendarId],
    queryFn: async (): Promise<BotStatus> => {
      if (!calendarId) {
        return { whatsapp_bot_active: false };
      }

      const { data, error } = await supabase
        .from('calendar_settings')
        .select('whatsapp_bot_active, last_bot_activity')
        .eq('calendar_id', calendarId)
        .single();

      if (error) throw error;
      return data || { whatsapp_bot_active: false };
    },
    enabled: !!calendarId,
  });

  const toggleMutation = useMutation({
    mutationFn: async (active: boolean) => {
      if (!calendarId) throw new Error('No calendar ID');

      const { error } = await supabase
        .from('calendar_settings')
        .upsert({
          calendar_id: calendarId,
          whatsapp_bot_active: active,
          last_bot_activity: active ? new Date().toISOString() : null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-status', calendarId] });
    },
  });

  return {
    ...query,
    toggleBot: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
  };
}
