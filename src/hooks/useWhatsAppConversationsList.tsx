
import { useMemo } from 'react';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';

interface ConversationsFilter {
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'closed' | 'archived';
  dateRange: { start: Date; end: Date };
}

export function useWhatsAppConversationsList(
  calendarId: string,
  filters: ConversationsFilter
) {
  const { data: conversations, isLoading, error } = useWhatsAppConversations(calendarId);

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];

    return conversations.filter(conversation => {
      const contact = conversation.whatsapp_contacts;
      
      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          contact?.phone_number?.includes(searchLower) ||
          contact?.display_name?.toLowerCase().includes(searchLower) ||
          contact?.first_name?.toLowerCase().includes(searchLower) ||
          contact?.last_name?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.statusFilter !== 'all' && conversation.status !== filters.statusFilter) {
        return false;
      }

      // Date range filter
      const lastActivity = conversation.last_message_at ? new Date(conversation.last_message_at) : new Date(conversation.created_at);
      if (lastActivity < filters.dateRange.start || lastActivity > filters.dateRange.end) {
        return false;
      }

      return true;
    });
  }, [conversations, filters]);

  return {
    conversations: filteredConversations,
    isLoading,
    error,
    totalCount: conversations?.length || 0,
    filteredCount: filteredConversations.length,
  };
}
