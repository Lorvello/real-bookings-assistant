
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// R135 hygiene: the unscoped useWhatsAppConversations(calendarId) query hook, plus
// useCreateWhatsAppConversation and useUpdateConversationStatus, had zero live consumers
// (their only callers, ContactSidebar.tsx and ConversationsList.tsx, were themselves dead
// components with no importers anywhere in the app). Removed rather than fixed, per the
// "prefer correctness over reusing a fundamentally global data source" guidance: the query
// hook read the same unscoped whatsapp_contacts join first_name/last_name pattern R134/R135
// fixed elsewhere, so keeping it around as unreferenced dead code was itself a latent
// cross-tenant-bleed trap for a future caller. useCloseConversation is the one export here
// with a live consumer (ConversationDetailPanel.tsx) and is kept as-is.

// Close a contact's conversation from the operator inbox, scoped to ONE calendar. The
// whatsapp_contact_overview is a materialized view, so we refresh it after the
// write and invalidate the overview query for both this contact and the list.
//
// R136: contact_id alone is NOT tenant-scoped. whatsapp_contacts is a GLOBAL table keyed
// by phone_number (shared across every tenant/calendar that phone has ever talked to, and
// also across multiple calendars owned by the SAME logged-in user, e.g. Lorvello's 2
// calendars). A contact_id-only update here closed EVERY calendar's conversation for that
// phone number, not just the one the operator was looking at, matching the R134/R135
// contact_id-only-filter bug class in the sibling read-path hooks. calendar_id must be
// filtered too, matching the pattern already proven correct there.
export function useCloseConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, calendarId }: { contactId: string; calendarId: string }) => {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ status: 'closed' })
        .eq('contact_id', contactId)
        .eq('calendar_id', calendarId);

      if (error) throw error;

      // Reflect the new status in the materialized overview.
      await supabase.rpc('refresh_whatsapp_contact_overview');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contact-overview'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
  });
}
