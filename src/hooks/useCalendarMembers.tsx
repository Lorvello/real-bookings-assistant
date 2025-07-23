import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export const useCalendarMembers = (calendarId?: string) => {
  const [members, setMembers] = useState<CalendarMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMembers = async () => {
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
        title: "Fout bij laden leden",
        description: "Kon kalender leden niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user exists or create new user using security definer function
  const findOrCreateUser = async (email: string, fullName: string = '', calendarId?: string) => {
    try {
      // First check if user exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (userData) {
        // User exists, update name if provided
        if (fullName) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ full_name: fullName })
            .eq('id', userData.id);

          if (updateError) {
            console.error('Error updating user name:', updateError);
          }
        }
        return userData;
      }

      // User doesn't exist, create new user using security definer function
      if (!calendarId) {
        throw new Error('Calendar ID is required for creating new users');
      }

      const { data: newUserId, error: createError } = await supabase
        .rpc('create_team_member_user', {
          p_email: email,
          p_full_name: fullName || email.split('@')[0],
          p_calendar_id: calendarId
        });

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      return { id: newUserId, email };
    } catch (error) {
      console.error('Error finding or creating user:', error);
      throw error;
    }
  };

  // Simplified function to invite a member to one calendar
  const inviteMember = async (
    email: string, 
    calendarIdForInvite: string, 
    role: 'editor' | 'viewer' = 'viewer', 
    fullName: string = ''
  ) => {
    try {
      // Find or create user (pass calendarId for potential user creation)
      const userData = await findOrCreateUser(email, fullName, calendarIdForInvite);
      
      // Check if the user is already a member of this calendar
      const { data: existingMembership } = await supabase
        .from('calendar_members')
        .select('id')
        .eq('user_id', userData.id)
        .eq('calendar_id', calendarIdForInvite)
        .single();
      
      if (existingMembership) {
        toast({
          title: "User is already a member",
          description: "This user already has access to this calendar",
          variant: "destructive",
        });
        return;
      }

      // Create the membership
      const invitedBy = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from('calendar_members')
        .insert({
          calendar_id: calendarIdForInvite,
          user_id: userData.id,
          role: role,
          invited_by: invitedBy
        });

      if (error) throw error;

      toast({
        title: "User invited",
        description: `${email} has been added successfully`,
      });

      fetchMembers();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: "Error inviting user",
        description: "Could not invite the user",
        variant: "destructive",
      });
    }
  };

  // Keep for multi-calendar invitations when needed
  const inviteMemberToMultipleCalendars = async (
    email: string, 
    calendarIds: string[], 
    role: 'editor' | 'viewer' = 'viewer', 
    fullName: string = ''
  ) => {
    if (!calendarIds.length) {
      toast({
        title: "No calendars selected",
        description: "Please select at least one calendar",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find or create user (pass first calendar ID for potential user creation)
      const userData = await findOrCreateUser(email, fullName, calendarIds[0]);
      
      // Check for existing memberships and create new ones
      const { data: existingMemberships } = await supabase
        .from('calendar_members')
        .select('calendar_id')
        .eq('user_id', userData.id)
        .in('calendar_id', calendarIds);
      
      const existingCalendarIds = existingMemberships?.map(m => m.calendar_id) || [];
      const newCalendarIds = calendarIds.filter(id => !existingCalendarIds.includes(id));
      
      if (newCalendarIds.length === 0) {
        toast({
          title: "User is already a member",
          description: "This user already has access to all selected calendars",
          variant: "destructive",
        });
        return;
      }

      // Create memberships for calendars user isn't already part of
      const invitedBy = (await supabase.auth.getUser()).data.user?.id;
      const memberships = newCalendarIds.map(calendarId => ({
        calendar_id: calendarId,
        user_id: userData.id,
        role: role,
        invited_by: invitedBy
      }));

      const { error } = await supabase
        .from('calendar_members')
        .insert(memberships);

      if (error) throw error;

      toast({
        title: "User invited",
        description: `${email} has been invited to ${newCalendarIds.length} calendar(s) as ${role}`,
      });

      fetchMembers();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: "Error inviting user",
        description: "Could not invite the user",
        variant: "destructive",
      });
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
        title: "Member removed",
        description: "User no longer has access to this calendar",
      });

      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error removing member",
        description: "Could not remove the member",
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
        title: "Role updated",
        description: "The member's role has been updated successfully",
      });

      fetchMembers();
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: "Error updating role",
        description: "Could not update the role",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [calendarId]);

  return {
    members,
    loading,
    inviteMember,
    inviteMemberToMultipleCalendars,
    removeMember,
    updateMemberRole,
    refetch: fetchMembers
  };
};
