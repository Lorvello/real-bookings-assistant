import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface GlobalBotStatus {
  whatsapp_bot_active: boolean;
  last_updated: string;
}

export function useGlobalBotStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['global-bot-status', user?.id],
    queryFn: async (): Promise<GlobalBotStatus | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('users')
        .select('whatsapp_bot_active')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return {
        whatsapp_bot_active: data?.whatsapp_bot_active || false,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });

  const toggleBotMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!user?.id) throw new Error('User ID required');

      // Keep the denormalized global flag in sync (this hook reads it for the
      // master toggle's displayed state).
      const { error: userErr } = await supabase
        .from('users')
        .update({ whatsapp_bot_active: isActive })
        .eq('id', user.id);
      if (userErr) throw userErr;

      // THE REAL SWITCH. The whatsapp-webhook edge function and the
      // business_overview projection both gate the bot on
      // calendar_settings.whatsapp_bot_active, NOT users.whatsapp_bot_active.
      // Writing only the users flag made this master toggle a no-op (the bot kept
      // running regardless). Cascade the master switch to every calendar so it
      // actually turns the bot on/off where it counts.
      const { data: calendars, error: calErr } = await supabase
        .from('calendars')
        .select('id')
        .eq('user_id', user.id);
      if (calErr) throw calErr;

      if (calendars && calendars.length > 0) {
        const { error: csErr } = await supabase
          .from('calendar_settings')
          .upsert(
            calendars.map((c) => ({ calendar_id: c.id, whatsapp_bot_active: isActive })),
            { onConflict: 'calendar_id' }
          );
        if (csErr) throw csErr;
      }

      return isActive;
    },
    onSuccess: (isActive) => {
      queryClient.invalidateQueries({ queryKey: ['global-bot-status', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['optimized-live-operations'] });
      // Per-calendar bot-status views read calendar_settings; refresh them too.
      queryClient.invalidateQueries({ queryKey: ['bot-status'] });

      toast({
        title: isActive ? "WhatsApp bot activated" : "WhatsApp bot paused",
        description: isActive ? "Your bot is now active and responding to messages" : "Your bot is paused",
      });
    },
    onError: (error) => {
      toast({
        title: "Error changing bot status",
        description: error instanceof Error ? error.message : "Unknown error",
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