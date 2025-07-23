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

  // Check if user exists or create new user
  const findOrCreateUser = async (email: string, fullName: string = '') => {
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

      // User doesn't exist, create new user
      const newUserId = crypto.randomUUID();
      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          email: email,
          full_name: fullName || email.split('@')[0]
        });

      if (createError) {
        throw createError;
      }

      return { id: newUserId, email };
    } catch (error) {
      console.error('Error finding or creating user:', error);
      throw error;
    }
  };

  const inviteMemberToMultipleCalendars = async (
    email: string, 
    calendarIds: string[], 
    role: 'editor' | 'viewer' = 'viewer', 
    fullName: string = ''
  ) => {
    if (calendarIds.length === 0) {
      toast({
        title: "Fout bij uitnodigen",
        description: "Selecteer ten minste één kalender",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find or create user
      const userData = await findOrCreateUser(email, fullName);
      
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
          title: "Gebruiker is al lid",
          description: "Deze gebruiker heeft al toegang tot alle geselecteerde kalenders",
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
        title: "Uitnodiging verstuurd",
        description: `${email} is uitgenodigd voor ${newCalendarIds.length} kalender(s) als ${role}`,
      });

      fetchMembers();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: "Fout bij uitnodigen",
        description: "Kon gebruiker niet uitnodigen",
        variant: "destructive",
      });
    }
  };

  // Keep the original function for backward compatibility
  const inviteMember = async (email: string, calendarIdForInvite: string, role: 'editor' | 'viewer' = 'viewer', fullName: string = '') => {
    return inviteMemberToMultipleCalendars(email, [calendarIdForInvite], role, fullName);
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Lid verwijderd",
        description: "Gebruiker heeft geen toegang meer tot deze kalender",
      });

      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Fout bij verwijderen",
        description: "Kon lid niet verwijderen",
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
        title: "Rol bijgewerkt",
        description: "De rol van het lid is succesvol bijgewerkt",
      });

      fetchMembers();
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: "Fout bij bijwerken rol",
        description: "Kon rol niet bijwerken",
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
