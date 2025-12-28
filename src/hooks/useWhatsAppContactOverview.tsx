
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppContactOverview, BookingInfo } from '@/types/whatsappOverview';
import { Json } from '@/integrations/supabase/types';

// Helper functie om JSON naar BookingInfo[] te converteren
function parseAllBookings(jsonData: Json | null): BookingInfo[] {
  if (!jsonData || !Array.isArray(jsonData)) return [];
  return jsonData as unknown as BookingInfo[];
}

export function useWhatsAppContactOverview(calendarId?: string, showAll = true) {
  return useQuery({
    queryKey: ['whatsapp-contact-overview', calendarId, showAll],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_contact_overview')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      
      // Converteer de data naar het juiste type
      return (data || []).map(contact => ({
        ...contact,
        all_bookings: parseAllBookings(contact.all_bookings)
      })) as WhatsAppContactOverview[];
    },
    enabled: true,
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
