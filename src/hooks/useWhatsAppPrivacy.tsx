
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useWhatsAppDataExport(calendarId: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('export_whatsapp_data', {
        p_calendar_id: calendarId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `whatsapp-data-export-${calendarId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Voltooid",
        description: "Uw WhatsApp data is succesvol geëxporteerd.",
      });
    },
    onError: () => {
      toast({
        title: "Export Gefaald", 
        description: "Er is een fout opgetreden bij het exporteren van uw data.",
        variant: "destructive",
      });
    },
  });
}

export function useWhatsAppDataCleanup(calendarId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('cleanup_whatsapp_data_for_calendar', {
        p_calendar_id: calendarId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Opschoning Voltooid",
        description: "Oude WhatsApp data is succesvol verwijderd.",
      });
      
      // Refresh related queries
      queryClient.invalidateQueries({ queryKey: ['whatsapp-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-data-stats'] });
    },
    onError: () => {
      toast({
        title: "Opschoning Gefaald",
        description: "Er is een fout opgetreden bij het opschonen van de data.",
        variant: "destructive",
      });
    },
  });
}

export function useWhatsAppDataStats(calendarId: string) {
  return useQuery({
    queryKey: ['whatsapp-data-stats', calendarId],
    queryFn: async () => {
      const { data: analytics, error: analyticsError } = await supabase
        .from('whatsapp_analytics')
        .select('*')
        .eq('calendar_id', calendarId)
        .maybeSingle();
      
      if (analyticsError) throw analyticsError;

      // Get additional privacy-relevant stats
      const { data: archivedCount, error: archivedError } = await supabase
        .from('whatsapp_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('calendar_id', calendarId)
        .eq('status', 'archived');

      if (archivedError) throw archivedError;

      // Get old messages count using a subquery approach
      const { data: conversationIds, error: conversationError } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('calendar_id', calendarId);

      if (conversationError) throw conversationError;

      const conversationIdsList = conversationIds?.map(conv => conv.id) || [];
      
      let oldMessagesCount = 0;
      if (conversationIdsList.length > 0) {
        const { count: oldMessages, error: oldMessagesError } = await supabase
          .from('whatsapp_messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', conversationIdsList)
          .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        if (oldMessagesError) throw oldMessagesError;
        oldMessagesCount = oldMessages || 0;
      }

      return {
        ...analytics,
        archived_conversations: archivedCount || 0,
        old_messages_count: oldMessagesCount,
      };
    },
    enabled: !!calendarId,
  });
}

export function useWhatsAppRetentionSettings() {
  return useQuery({
    queryKey: ['whatsapp-retention-settings'],
    queryFn: async () => {
      // For now, return default settings
      // In the future, this could be user-configurable
      return {
        message_retention_days: 90,
        conversation_inactive_days: 30,
        booking_intent_abandoned_days: 7,
        auto_cleanup_enabled: true,
      };
    },
  });
}
