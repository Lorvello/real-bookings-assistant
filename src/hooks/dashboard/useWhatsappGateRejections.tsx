import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// WHATSAPP_E2E_TEST_INFRA Item 3 (gate-rejection visibility). Reads the owner-scoped RPC
// get_whatsapp_gate_rejections (supabase/migrations/20260708210000_WHATSAPPE2E3_...sql), which
// surfaces the two tenant-attributable WhatsApp gate rejections (entitlement, bot-toggle) from
// webhook_security_logs. Phone-resolution rejections (ambiguous/codeless) are not
// tenant-attributable and are not part of this surface; they are handled by severity escalation
// in the whatsapp-webhook edge function instead.
export const WHATSAPP_GATE_REJECTIONS_WINDOW_DAYS = 7;
export const WHATSAPP_GATE_REJECTIONS_MAX_ITEMS = 10;

export type WhatsappGateRejectionType = 'entitlement' | 'bot_off';

export interface WhatsappGateRejectionItem {
  type: WhatsappGateRejectionType;
  created_at: string;
}

export interface WhatsappGateRejectionsSummary {
  items: WhatsappGateRejectionItem[];
  window_days: number;
}

interface GateRejectionsRpcResult {
  entitlement_blocked?: Array<{ created_at: string; status: string | null }>;
  bot_off_blocked?: Array<{ created_at: string; calendar_id: string | null }>;
}

export function useWhatsappGateRejections(calendarIds: string[]) {
  return useQuery({
    queryKey: ['whatsapp-gate-rejections', calendarIds],
    queryFn: async (): Promise<WhatsappGateRejectionsSummary | null> => {
      if (!calendarIds || calendarIds.length === 0) return null;

      const { data, error } = await supabase.rpc('get_whatsapp_gate_rejections', {
        p_calendar_ids: calendarIds,
        p_days: WHATSAPP_GATE_REJECTIONS_WINDOW_DAYS,
      });

      if (error) {
        console.error('Error fetching WhatsApp gate rejections:', error);
        throw error;
      }

      const result = (data as GateRejectionsRpcResult) ?? {};
      const items: WhatsappGateRejectionItem[] = [
        ...(result.entitlement_blocked ?? []).map((r) => ({ type: 'entitlement' as const, created_at: r.created_at })),
        ...(result.bot_off_blocked ?? []).map((r) => ({ type: 'bot_off' as const, created_at: r.created_at })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return { items, window_days: WHATSAPP_GATE_REJECTIONS_WINDOW_DAYS };
    },
    enabled: !!calendarIds && calendarIds.length > 0,
    staleTime: 60000,
    gcTime: 300000,
    refetchInterval: 120000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
