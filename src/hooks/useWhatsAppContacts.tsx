
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppContact } from '@/types/whatsapp';

export function useWhatsAppContacts(calendarId?: string) {
  return useQuery({
    queryKey: ['whatsapp-contacts', calendarId],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_contacts')
        .select(`
          *,
          whatsapp_conversations!inner (
            calendar_id
          )
        `);

      if (calendarId) {
        query = query.eq('whatsapp_conversations.calendar_id', calendarId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as WhatsAppContact[];
    },
    enabled: !!calendarId,
  });
}

export function useCreateWhatsAppContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Partial<WhatsAppContact>) => {
      const { data, error } = await supabase
        .from('whatsapp_contacts')
        .insert([contact])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
    },
  });
}
