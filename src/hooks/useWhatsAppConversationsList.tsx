
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
      // R3 cross-tenant name bleed (extended, F-SEV1-2): whatsapp_contacts is a GLOBAL table
      // (phone_number UNIQUE, no calendar_id) shared across every tenant a phone has talked to.
      // Its first_name/last_name get overwritten by update_lead regardless of which tenant's
      // conversation captured the name, so reading them here for display could show Tenant A a
      // name that was actually supplied during an unrelated Tenant B conversation. Still select
      // phone_number/display_name/contact_created_at from it (pure phone-level fields, not
      // customer-supplied identity), but first_name/last_name are read from THIS tenant's OWN
      // whatsapp_conversations.context.booking_name below (already the correct per-tenant source
      // of truth used by the live agent's own knownName resolution), never from the shared row.
      let query = supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          whatsapp_contact_overview:whatsapp_contacts!whatsapp_conversations_contact_id_fkey (
            contact_id:id,
            phone_number,
            display_name,
            contact_created_at:created_at
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

      // Derive the tenant-scoped display name from THIS conversation's own context, never from
      // the shared whatsapp_contacts row (see comment above the query). booking_name is written
      // per-conversation by update_lead (tools.ts), so it can never bleed in from another tenant.
      type ScopedOverview = {
        contact_id?: string;
        phone_number?: string;
        display_name?: string;
        contact_created_at?: string;
        first_name?: string;
        last_name?: string;
      };
      const withScopedName = (data || []).map((conversation) => {
        const context = (conversation as { context?: Record<string, unknown> }).context ?? {};
        const bookingName = typeof context.booking_name === 'string' ? context.booking_name.trim() : '';
        const [scopedFirst, ...scopedRest] = bookingName ? bookingName.split(/\s+/) : [];
        const overview = conversation.whatsapp_contact_overview as ScopedOverview | null;
        return {
          ...conversation,
          whatsapp_contact_overview: overview
            ? {
                ...overview,
                first_name: scopedFirst || undefined,
                last_name: scopedRest.length ? scopedRest.join(' ') : undefined,
              }
            : overview,
        };
      });

      // Apply search filter client-side for more flexibility
      let filteredData = withScopedName;

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
