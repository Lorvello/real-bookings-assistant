
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppMessage {
  id: string;
  content: string | null;
  direction: 'inbound' | 'outbound';
  created_at: string;
  status: string;
}

export function useWhatsAppMessages(contactId: string, calendarId?: string) {
  return useQuery({
    queryKey: ['whatsapp-messages', contactId, calendarId],
    queryFn: async (): Promise<WhatsAppMessage[]> => {
      if (!contactId) return [];

      // The real transcript lives in `whatsapp_messages` (the agent writes every inbound/outbound
      // there with direction + content + status), linked via conversation_id. `whatsapp_conversations`
      // is ONE row per (calendar, contact); its legacy `message`/`From` columns are stale n8n data,
      // NOT the message history. So: resolve this contact's conversation(s), then load their messages.
      //
      // R135: contact_id alone is NOT tenant-scoped. whatsapp_contacts is a GLOBAL table keyed
      // by phone_number, shared across every tenant that phone has ever talked to, so the same
      // contact_id can have a whatsapp_conversations row under multiple different calendars. A
      // contact_id-only lookup here would pull in another tenant's message transcript for a
      // shared phone number. calendar_id must be filtered too, matching the R134/R135 pattern
      // used by the sibling hooks.
      let query = supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('contact_id', contactId);
      if (calendarId) {
        query = query.eq('calendar_id', calendarId);
      }
      const { data: convs, error: convErr } = await query;
      if (convErr) throw convErr;

      const conversationIds = (convs ?? []).map((c) => c.id);
      if (conversationIds.length === 0) return [];

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('id, content, direction, created_at, status')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((m) => ({
        id: m.id,
        content: m.content,
        direction: (m.direction === 'outbound' ? 'outbound' : 'inbound') as 'inbound' | 'outbound',
        created_at: m.created_at || new Date().toISOString(),
        status: m.status || 'delivered',
      }));
    },
    enabled: !!contactId,
    refetchInterval: 5000,
  });
}
