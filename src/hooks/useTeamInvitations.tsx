import { useState, useEffect } from 'react';
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

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('team_invitations')
        .select(`
          *,
          calendars!inner(name)
        `)
        .order('created_at', { ascending: false });

      // If a specific calendarId is provided, filter by it
      if (calendarId) {
        query = query.eq('calendar_id', calendarId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setInvitations((data || []) as TeamInvitation[]);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast({
        title: "Fout bij laden uitnodigingen",
        description: "Kon uitnodigingen niet laden",
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
        title: "Uitnodiging geannuleerd",
        description: "De uitnodiging is succesvol geannuleerd",
      });

      fetchInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Fout bij annuleren",
        description: "Kon uitnodiging niet annuleren",
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
        title: "Uitnodiging opnieuw verzonden! 📧",
        description: `Een nieuwe uitnodiging is verzonden naar ${invitation.email}`,
      });

      fetchInvitations();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Fout bij opnieuw verzenden",
        description: error.message || "Kon uitnodiging niet opnieuw verzenden",
        variant: "destructive",
      });
    }
  };

  const cleanupExpiredInvitations = async () => {
    try {
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