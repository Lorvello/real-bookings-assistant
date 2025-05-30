
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface UseRealTimeUpdatesProps {
  user: User | null;
  onAppointmentUpdate?: () => void;
  onConversationUpdate?: () => void;
  onCalendarUpdate?: () => void;
  onSetupProgressUpdate?: () => void;
}

export const useRealTimeUpdates = ({
  user,
  onAppointmentUpdate,
  onConversationUpdate,
  onCalendarUpdate,
  onSetupProgressUpdate
}: UseRealTimeUpdatesProps) => {
  useEffect(() => {
    if (!user) return;

    console.log('[RealTime] Setting up real-time subscriptions for user:', user.id);

    // Appointments subscription
    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[RealTime] Appointment change:', payload);
          onAppointmentUpdate?.();
        }
      )
      .subscribe();

    // Conversations subscription
    const conversationsChannel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[RealTime] Conversation change:', payload);
          onConversationUpdate?.();
        }
      )
      .subscribe();

    // Calendar events subscription
    const calendarChannel = supabase
      .channel('calendar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[RealTime] Calendar change:', payload);
          onCalendarUpdate?.();
        }
      )
      .subscribe();

    // Setup progress subscription
    const setupChannel = supabase
      .channel('setup-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'setup_progress',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[RealTime] Setup progress change:', payload);
          onSetupProgressUpdate?.();
        }
      )
      .subscribe();

    return () => {
      console.log('[RealTime] Cleaning up subscriptions');
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(calendarChannel);
      supabase.removeChannel(setupChannel);
    };
  }, [user, onAppointmentUpdate, onConversationUpdate, onCalendarUpdate, onSetupProgressUpdate]);
};
