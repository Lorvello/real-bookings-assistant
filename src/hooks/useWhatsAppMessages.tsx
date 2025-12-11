
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppMessage {
  id: string;
  content: string | null;
  direction: 'inbound' | 'outbound';
  created_at: string;
  status: string;
}

export function useWhatsAppMessages(contactId: string) {
  return useQuery({
    queryKey: ['whatsapp-messages', contactId],
    queryFn: async (): Promise<WhatsAppMessage[]> => {
      if (!contactId) return [];

      // Haal alle berichten op voor deze contact uit de conversations tabel
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('id, message, "From", phone_number, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Map naar message format met direction op basis van From veld
      return data?.map(conv => ({
        id: conv.id,
        content: conv.message,
        direction: (conv.From === 'AI' ? 'outbound' : 'inbound') as 'inbound' | 'outbound',
        created_at: conv.created_at || new Date().toISOString(),
        status: 'delivered',
      })) || [];
    },
    enabled: !!contactId,
    refetchInterval: 5000,
  });
}
