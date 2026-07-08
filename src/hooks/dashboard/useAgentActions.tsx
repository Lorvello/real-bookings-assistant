import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMockDataControl } from '@/hooks/useMockDataControl';

// SEQP2R7 (P2-2b): the first owner-facing surface for the `agent_actions` log
// (data model + write sites built/verified in SEQP2R5/R6). Window = last
// ACTIVITY_LOG_WINDOW_DAYS (14) days: longer than the reminder engine's 7-day
// window (that one is a short-lived retry signal), because an owner scanning
// "what did the agent actually do to my calendar" reasonably wants slightly
// more than a week of context, but this is still a recent-activity feed, not
// a full audit trail export (no pagination/date-range picker this round).
export const ACTIVITY_LOG_WINDOW_DAYS = 14;
export const ACTIVITY_LOG_MAX_ITEMS = 25;

export type AgentActionType = 'book' | 'reschedule' | 'cancel' | 'no_show';
export type AgentActionActor = 'agent' | 'owner';
export type AgentActionChannel = 'whatsapp' | 'dashboard' | 'system';

export interface AgentActionItem {
  id: string;
  booking_id: string;
  action_type: AgentActionType;
  actor: AgentActionActor;
  channel: AgentActionChannel;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown>;
  conversation_id: string | null;
  created_at: string;
  customer_name: string;
}

export interface AgentActionsSummary {
  items: AgentActionItem[];
  window_days: number;
}

export function useAgentActions(calendarIds: string[]) {
  const { useMockData } = useMockDataControl();

  return useQuery({
    queryKey: ['agent-actions', calendarIds],
    queryFn: async (): Promise<AgentActionsSummary | null> => {
      if (!calendarIds || calendarIds.length === 0) return null;

      if (useMockData) {
        return {
          window_days: ACTIVITY_LOG_WINDOW_DAYS,
          items: [
            {
              id: 'sample-reschedule',
              booking_id: 'sample-booking-1',
              action_type: 'reschedule',
              actor: 'agent',
              channel: 'whatsapp',
              old_value: { start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
              new_value: { start_time: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString() },
              conversation_id: 'sample-conversation-1',
              created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
              customer_name: 'Emma van der Berg',
            },
            {
              id: 'sample-book',
              booking_id: 'sample-booking-2',
              action_type: 'book',
              actor: 'agent',
              channel: 'whatsapp',
              old_value: null,
              new_value: { start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() },
              conversation_id: 'sample-conversation-2',
              created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
              customer_name: 'Daan Willemsen',
            },
            {
              id: 'sample-no-show',
              booking_id: 'sample-booking-3',
              action_type: 'no_show',
              actor: 'owner',
              channel: 'dashboard',
              old_value: { status: 'confirmed' },
              new_value: { status: 'no-show' },
              conversation_id: null,
              created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
              customer_name: 'Sophie Bakker',
            },
          ],
        };
      }

      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - ACTIVITY_LOG_WINDOW_DAYS);

      // RLS (SEQP2R5, verified SEQP2R6: `agent_actions_owner_read` via
      // `caller_owns_calendar`) already scopes this to the caller's own tenant;
      // the calendarIds filter further narrows to whichever calendar(s) are
      // selected in the dashboard's own calendar switcher, matching every
      // sibling dashboard hook's own scoping convention (no client-side
      // tenant filtering is added on top of RLS, same discipline as
      // useReminderActivity).
      const { data, error } = await supabase
        .from('agent_actions')
        .select(
          `
          id,
          booking_id,
          action_type,
          actor,
          channel,
          old_value,
          new_value,
          conversation_id,
          created_at,
          bookings!inner(customer_name, calendar_id)
        `
        )
        .gte('created_at', windowStart.toISOString())
        .in('bookings.calendar_id', calendarIds)
        .order('created_at', { ascending: false })
        .limit(ACTIVITY_LOG_MAX_ITEMS);

      if (error) {
        console.error('Error fetching agent actions:', error);
        throw error;
      }

      const rows = data || [];

      const items: AgentActionItem[] = rows.map((row: any) => ({
        id: row.id,
        booking_id: row.booking_id,
        action_type: row.action_type as AgentActionType,
        actor: row.actor as AgentActionActor,
        channel: row.channel as AgentActionChannel,
        old_value: row.old_value,
        new_value: row.new_value,
        conversation_id: row.conversation_id,
        created_at: row.created_at,
        customer_name: row.bookings?.customer_name || '',
      }));

      return { items, window_days: ACTIVITY_LOG_WINDOW_DAYS };
    },
    enabled: !!calendarIds && calendarIds.length > 0,
    staleTime: 30000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
