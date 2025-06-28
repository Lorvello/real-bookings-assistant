
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppContactOverview } from '@/types/whatsappOverview';

export function useWhatsAppContactOverview(calendarId?: string) {
  return useQuery({
    queryKey: ['whatsapp-contact-overview', calendarId],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_contact_overview')
        .select('*')
        .order('laatste_booking', { ascending: false, nullsFirst: false })
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (calendarId) {
        query = query.eq('calendar_id', calendarId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as WhatsAppContactOverview[];
    },
    enabled: !!calendarId,
  });
}

export function useRefreshWhatsAppContactOverview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('refresh_whatsapp_contact_overview');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contact-overview'] });
    },
  });
}
