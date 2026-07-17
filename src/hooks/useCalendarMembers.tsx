import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getOrCreateTeamInvitationRequestId } from '@/utils/teamInvitationRequest';

interface CalendarMember {
  id: string;
  calendar_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  invited_by?: string;
  invited_at?: string;
  accepted_at?: string;
  created_at: string;
  user?: {
    full_name?: string;
    email: string;
  };
  calendar?: {
    id: string;
    name: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const useCalendarMembers = (calendarId?: string) => {
  const [members, setMembers] = useState<CalendarMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useTranslation('notifications');
  const pendingInviteRequestIds = useRef(new Map<string, string>());

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('calendar_members')
        .select(`
          *,
          users!calendar_members_user_id_fkey(full_name, email),
          calendars!calendar_members_calendar_id_fkey(id, name)
        `)
        .order('created_at', { ascending: false });

      // If a specific calendarId is provided, filter by it
      if (calendarId) {
        query = query.eq('calendar_id', calendarId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedMembers = (data || []).map(member => ({
        ...member,
        user: member.users ? {
          full_name: member.users.full_name,
          email: member.users.email
        } : undefined,
        calendar: member.calendars ? {
          id: member.calendars.id,
          name: member.calendars.name
        } : undefined
      }));
      
      setMembers(transformedMembers as CalendarMember[]);
    } catch (error) {
      console.error('Error fetching calendar members:', error);
      toast({
        title: t('calendarMembers.loadError.title', 'Error loading members'),
        description: t('calendarMembers.loadError.description', 'Could not load calendar members'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [calendarId, t, toast]);

  // New invitation system using email invitations
  const inviteMember = async (
    email: string,
    calendarIdForInvite: string,
    role: 'editor' | 'viewer' = 'viewer',
    fullName: string = ''
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const request = getOrCreateTeamInvitationRequestId(
        pendingInviteRequestIds.current,
        {
          calendarId: calendarIdForInvite,
          email,
          fullName,
          role,
        },
      );

      // Use the new edge function to send invitation
      const { error } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          request_id: request.requestId,
          calendar_id: calendarIdForInvite,
          email: email,
          full_name: fullName || '',
          role: role
        }
      });

      if (error) {
        console.error('Error sending invitation:', error);
        // The edge function returns a 400 with a specific reason (e.g. team-member
        // limit reached). supabase-js puts the response body on error.context — read
        // it so the user sees the real reason instead of a generic failure.
        let description = error.message || t('calendarMembers.inviteSendError.description', 'Could not send invitation.');
        try {
          const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
          const body = await context?.json?.();
          if (isRecord(body) && typeof body.error === 'string') {
            description = body.error;
          }
        } catch { /* body not JSON, keep generic message */ }
        toast({
          title: t('calendarMembers.inviteSendError.title', 'Error'),
          description,
          variant: "destructive",
        });
        return false;
      }

      pendingInviteRequestIds.current.delete(request.key);

      // Refresh the members list to show any updates
      await fetchMembers();

      toast({
        title: t('calendarMembers.inviteSent.title', 'Invitation sent! 📧'),
        description: t('calendarMembers.inviteSent.description', 'An invitation has been sent to {{email}}. They have 48 hours to accept.', { email }),
      });
      return true;

    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: t('calendarMembers.inviteError.title', 'Error'),
        description: t('calendarMembers.inviteError.description', 'Something went wrong while sending the invitation.'),
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: t('calendarMembers.memberRemoved.title', 'Member removed'),
        description: t('calendarMembers.memberRemoved.description', 'User no longer has access to this calendar'),
      });

      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: t('calendarMembers.removeMemberError.title', 'Error removing member'),
        description: t('calendarMembers.removeMemberError.description', 'Could not remove the member'),
        variant: "destructive",
      });
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'editor' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('calendar_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: t('calendarMembers.roleUpdated.title', 'Role updated'),
        description: t('calendarMembers.roleUpdated.description', "The member's role has been updated successfully"),
      });

      fetchMembers();
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: t('calendarMembers.updateRoleError.title', 'Error updating role'),
        description: t('calendarMembers.updateRoleError.description', 'Could not update the role'),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    inviteMember,
    removeMember,
    updateMemberRole,
    refetch: fetchMembers
  };
};
