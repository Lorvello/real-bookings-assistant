
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppConversation } from '@/types/whatsapp';

interface ConversationFilters {
  searchTerm?: string;
  statusFilter?: 'all' | 'active' | 'closed' | 'archived';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export function useWhatsAppConversationsList(
  calendarId: string,
  filters: ConversationFilters = {}
) {
  const conversationsQuery = useQuery({
    queryKey: ['whatsapp-conversations-list', calendarId, filters],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          whatsapp_contact_overview!whatsapp_conversations_contact_id_fkey (
            contact_id,
            phone_number,
            display_name,
            first_name,
            last_name,
            last_message_at,
            contact_created_at
          )
        `)
        .eq('calendar_id', calendarId);

      // Apply status filter
      if (filters.statusFilter && filters.statusFilter !== 'all') {
        query = query.eq('status', filters.statusFilter);
      }

      // Apply date range filter
      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }

      query = query
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Apply search filter client-side for more flexibility
      let filteredData = data || [];
      
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredData = filteredData.filter(conversation => {
          const contact = conversation.whatsapp_contact_overview;
          if (!contact) return false;
          
          return (
            contact.phone_number?.toLowerCase().includes(searchLower) ||
            contact.display_name?.toLowerCase().includes(searchLower) ||
            contact.first_name?.toLowerCase().includes(searchLower) ||
            contact.last_name?.toLowerCase().includes(searchLower)
          );
        });
      }

      return filteredData;
    },
    enabled: !!calendarId,
    staleTime: 30000, // 30 seconds
  });

  return {
    conversations: conversationsQuery.data || [],
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,
    refetch: conversationsQuery.refetch,
  };
}
