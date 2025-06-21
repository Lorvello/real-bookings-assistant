
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BotStatus {
  whatsapp_bot_active: boolean;
  last_bot_activity?: string;
}

export function useBotStatus(calendarId?: string) {
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

      const { error } = await supabase
        .from('calendar_settings')
        .update({ 
          whatsapp_bot_active: isActive,
          last_bot_activity: isActive ? new Date().toISOString() : undefined
        })
        .eq('calendar_id', calendarId);

      if (error) throw error;
      return isActive;
    },
    onSuccess: (isActive) => {
      queryClient.invalidateQueries({ queryKey: ['bot-status', calendarId] });
      
      toast({
        title: isActive ? "WhatsApp Bot geactiveerd" : "WhatsApp Bot gepauzeerd",
        description: isActive ? "Je bot is nu actief en reageert op berichten" : "Je bot is gepauzeerd",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij wijzigen bot status",
        description: error instanceof Error ? error.message : "Onbekende fout",
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
