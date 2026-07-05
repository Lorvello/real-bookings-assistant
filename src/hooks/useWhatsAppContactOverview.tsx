
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppContactOverview, BookingInfo } from '@/types/whatsappOverview';

// R135 (3rd cross-tenant bleed, broader than the R134 fixes to the two sibling hooks):
// `whatsapp_contact_overview` is a MATERIALIZED TABLE built ONE ROW PER GLOBAL CONTACT
// (see refresh_whatsapp_contact_overview, migration 20251230160415), not per tenant: it has
// no calendar_id column at all, sources first_name/last_name from the shared cross-tenant
// whatsapp_contacts row, and aggregates all_bookings across EVERY calendar/tenant that has
// ever shared this phone number. The old code here accepted a calendarId param but only put
// it in the React Query cache key, never in the actual query, so every tenant's dashboard
// read the exact same unscoped `select('*')` and saw every OTHER tenant's contact names and
// full booking history for any phone number shared across tenants.
//
// Fix: stop reading the global materialization for tenant-facing display entirely. Compose
// the same data from THIS tenant's own scoped sources instead, matching the proven pattern
// from the two sibling hooks R134 already fixed (useWhatsAppConversationsList.tsx,
// useWhatsAppContacts.tsx): whatsapp_conversations filtered by calendar_id for the name
// (context.booking_name, never the shared whatsapp_contacts row) and status/timestamps, and
// bookings filtered by calendar_id for all_bookings. phone_number/display_name are still read
// from whatsapp_contacts (pure phone-level fields, not customer-supplied identity, same
// carve-out the sibling hooks use).
export function useWhatsAppContactOverview(calendarId?: string, showAll = true) {
  return useQuery({
    queryKey: ['whatsapp-contact-overview', calendarId, showAll],
    queryFn: async (): Promise<WhatsAppContactOverview[]> => {
      if (!calendarId) return [];

      const { data: conversations, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select(`
          contact_id,
          status,
          context,
          session_id,
          last_message_at,
          created_at,
          whatsapp_contacts!inner (
            id,
            phone_number,
            display_name,
            last_seen_at,
            created_at
          )
        `)
        .eq('calendar_id', calendarId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (convError) throw convError;

      const rows = conversations ?? [];
      if (rows.length === 0) return [];

      const phoneNumbers = Array.from(
        new Set(
          rows
            .map((row) => (row.whatsapp_contacts as { phone_number?: string } | null)?.phone_number)
            .filter((p): p is string => !!p)
        )
      );

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          calendar_id,
          customer_phone,
          start_time,
          end_time,
          service_type_id,
          service_name,
          status,
          customer_name,
          customer_email,
          calendars ( name )
        `)
        .eq('calendar_id', calendarId)
        .eq('is_deleted', false)
        .in('customer_phone', phoneNumbers)
        .order('start_time', { ascending: false });

      if (bookingsError) throw bookingsError;

      const bookingsByPhone = new Map<string, BookingInfo[]>();
      for (const b of bookings ?? []) {
        const list = bookingsByPhone.get(b.customer_phone) ?? [];
        list.push({
          booking_id: b.id,
          calendar_id: b.calendar_id,
          calendar_name: (b.calendars as { name?: string } | null)?.name ?? null,
          business_name: null,
          start_time: b.start_time,
          end_time: b.end_time,
          service_type_id: b.service_type_id,
          service_name: b.service_name,
          status: b.status,
          customer_name: b.customer_name,
          customer_email: b.customer_email,
        });
        bookingsByPhone.set(b.customer_phone, list);
      }

      return rows
        .filter((row) => !!row.contact_id)
        .map((row) => {
          const contact = row.whatsapp_contacts as {
            id: string;
            phone_number: string;
            display_name: string | null;
            last_seen_at: string | null;
            created_at: string | null;
          };
          const context = (row.context ?? {}) as Record<string, unknown>;
          const bookingName = typeof context.booking_name === 'string' ? context.booking_name.trim() : '';
          const [scopedFirst, ...scopedRest] = bookingName ? bookingName.split(/\s+/) : [];

          return {
            contact_id: row.contact_id as string,
            phone_number: contact.phone_number,
            display_name: contact.display_name ?? undefined,
            first_name: scopedFirst || undefined,
            last_name: scopedRest.length ? scopedRest.join(' ') : undefined,
            session_id: row.session_id ?? undefined,
            last_seen_at: contact.last_seen_at ?? undefined,
            contact_created_at: contact.created_at ?? undefined,
            conversation_status: row.status ?? undefined,
            last_message_at: row.last_message_at ?? undefined,
            conversation_created_at: row.created_at ?? undefined,
            all_bookings: bookingsByPhone.get(contact.phone_number) ?? [],
          } satisfies WhatsAppContactOverview;
        });
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
