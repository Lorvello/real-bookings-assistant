
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppContactOverview } from '@/types/whatsappOverview';

export function useWhatsAppContactOverview(calendarId?: string, showAll = true) {
  return useQuery({
    queryKey: ['whatsapp-contact-overview', calendarId, showAll],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_contact_overview')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('laatste_booking', { ascending: false, nullsFirst: false });

      // Alleen filteren als showAll = false EN calendarId bestaat
      if (!showAll && calendarId) {
        query = query.eq('calendar_id', calendarId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as WhatsAppContactOverview[];
    },
    enabled: true, // Altijd enabled - toon alle contacts
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
