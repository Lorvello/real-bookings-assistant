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

      const { error } = await supabase
        .from('users')
        .update({ whatsapp_bot_active: isActive })
        .eq('id', user.id);

      if (error) throw error;
      return isActive;
    },
    onSuccess: (isActive) => {
      queryClient.invalidateQueries({ queryKey: ['global-bot-status', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['optimized-live-operations'] });
      
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