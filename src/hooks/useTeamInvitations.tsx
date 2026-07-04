import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TeamInvitation {
  id: string;
  email: string;
  full_name: string;
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  calendar_id: string;
  calendars?: {
    name: string;
  };
}

export const useTeamInvitations = (calendarId?: string) => {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useTranslation('notifications');

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('team_invitations')
        .select(`
          *,
          calendars!inner(name)
        `)
        // Only show invitations that are still actionable. 'accepted' members
        // already appear as a real calendar_members row (badge 'Active'), and
        // 'cancelled' invites were dismissed by the user — showing either leaves
        // a ghost/duplicate row with an empty status badge + empty actions.
        .in('status', ['pending', 'expired'])
        .order('created_at', { ascending: false });

      // If a specific calendarId is provided, filter by it
      if (calendarId) {
        query = query.eq('calendar_id', calendarId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Derive actual expiry from expires_at at read time rather than trusting the stored
      // `status` column, which is only ever flipped from 'pending' to 'expired' by a client-side
      // interval (see cleanupExpiredInvitations below) or the server cron. Neither is guaranteed to
      // have run yet for a given session, so display must not depend on either: a row whose
      // expires_at has already passed is shown as expired immediately, in any session, on first load.
      const withDerivedExpiry = (data || []).map((inv: any) => {
        if (inv.status === 'pending' && new Date(inv.expires_at).getTime() <= Date.now()) {
          return { ...inv, status: 'expired' as const };
        }
        return inv;
      });

      setInvitations(withDerivedExpiry as TeamInvitation[]);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast({
        title: t('teamInvitations.loadErrorTitle', 'Error loading invitations'),
        description: t('teamInvitations.loadErrorDescription', 'Could not load invitations'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: t('teamInvitations.cancelledTitle', 'Invitation cancelled'),
        description: t('teamInvitations.cancelledDescription', 'The invitation has been successfully cancelled'),
      });

      fetchInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: t('teamInvitations.cancelErrorTitle', 'Error cancelling'),
        description: t('teamInvitations.cancelErrorDescription', 'Could not cancel invitation'),
        variant: "destructive",
      });
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      // Get invitation details
      const { data: invitation, error: fetchError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError || !invitation) {
        throw new Error('Could not find invitation');
      }

      // Use the edge function to resend invitation
      const { error } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          calendar_id: invitation.calendar_id,
          email: invitation.email,
          full_name: invitation.full_name || '',
          role: invitation.role
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: t('teamInvitations.resentTitle', 'Invitation resent! 📧'),
        description: t('teamInvitations.resentDescription', 'A new invitation has been sent to {{email}}', { email: invitation.email }),
      });

      fetchInvitations();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast({
        title: t('teamInvitations.resendErrorTitle', 'Error resending'),
        description: error.message || t('teamInvitations.resendErrorDescription', 'Could not resend invitation'),
        variant: "destructive",
      });
    }
  };

  const cleanupExpiredInvitations = async () => {
    try {
      // Best-effort write-through of the stored `status` column while this tab happens to be
      // open. NOT relied upon for correctness: display already derives real expiry from
      // expires_at in fetchInvitations above, and a server-side pg_cron job
      // ('cleanup-expired-invitations', see supabase/migrations) keeps the stored column
      // coherent even when no owner has this tab open at all.
      await supabase.rpc('cleanup_expired_invitations');
      fetchInvitations();
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
    }
  };

  useEffect(() => {
    fetchInvitations();

    // Set up periodic cleanup of expired invitations
    const cleanup = setInterval(cleanupExpiredInvitations, 60000); // Every minute

    return () => clearInterval(cleanup);
  }, [calendarId]);

  // Calculate invitation stats
  const stats = {
    total: invitations.length,
    pending: invitations.filter(inv => inv.status === 'pending').length,
    accepted: invitations.filter(inv => inv.status === 'accepted').length,
    expired: invitations.filter(inv => inv.status === 'expired').length,
    cancelled: invitations.filter(inv => inv.status === 'cancelled').length,
  };

  // Get invitations expiring soon (within 6 hours)
  const expiringSoon = invitations.filter(inv => {
    if (inv.status !== 'pending') return false;
    const expiresAt = new Date(inv.expires_at);
    const hoursUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 6 && hoursUntilExpiry > 0;
  });

  return {
    invitations,
    loading,
    stats,
    expiringSoon,
    cancelInvitation,
    resendInvitation,
    refetch: fetchInvitations
  };
};