
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppContact } from '@/types/whatsapp';

export function useWhatsAppContacts(calendarId?: string) {
  return useQuery({
    queryKey: ['whatsapp-contacts', calendarId],
    queryFn: async () => {
      // R3 cross-tenant name bleed (extended, F-SEV1-2): whatsapp_contacts is a GLOBAL table
      // (phone_number UNIQUE, no calendar_id) shared across every tenant a phone has talked to.
      // Its first_name/last_name get overwritten by update_lead regardless of which tenant's
      // conversation captured the name, so returning them as-is here could show Tenant A a name
      // that was actually supplied during an unrelated Tenant B conversation. Also select THIS
      // calendar's own conversation context, so first_name/last_name can be overridden below with
      // the tenant-scoped context.booking_name (already the correct per-tenant source of truth
      // used by the live agent's own knownName resolution), never the shared row's fields.
      let query = supabase
        .from('whatsapp_contacts')
        .select(`
          *,
          whatsapp_conversations!inner (
            calendar_id,
            context
          )
        `);

      if (calendarId) {
        query = query.eq('whatsapp_conversations.calendar_id', calendarId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const scoped = (data || []).map((row) => {
        const conversations = (row as { whatsapp_conversations?: Array<{ context?: Record<string, unknown> }> | { context?: Record<string, unknown> } }).whatsapp_conversations;
        const convList = Array.isArray(conversations) ? conversations : (conversations ? [conversations] : []);
        const bookingName = convList
          .map((c) => c?.context?.booking_name)
          .find((n): n is string => typeof n === 'string' && n.trim().length > 0)
          ?.trim();
        const [scopedFirst, ...scopedRest] = bookingName ? bookingName.split(/\s+/) : [];
        return {
          ...row,
          first_name: scopedFirst || undefined,
          last_name: scopedRest.length ? scopedRest.join(' ') : undefined,
        };
      });

      return scoped as WhatsAppContact[];
    },
    enabled: !!calendarId,
  });
}

export function useCreateWhatsAppContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Omit<WhatsAppContact, 'id' | 'created_at' | 'updated_at'> & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    }) => {
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
