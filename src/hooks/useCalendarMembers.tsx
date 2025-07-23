
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
}

export const useCalendarMembers = (calendarId: string) => {
  const [members, setMembers] = useState<CalendarMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMembers = async () => {
    if (!calendarId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('calendar_members')
        .select(`
          *,
          users!calendar_members_user_id_fkey(full_name, email)
        `)
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedMembers = (data || []).map(member => ({
        ...member,
        user: member.users ? {
          full_name: member.users.full_name,
          email: member.users.email
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

  const inviteMember = async (email: string, role: 'editor' | 'viewer' = 'viewer', fullName: string = '') => {
    if (!calendarId) {
      toast({
        title: "Fout bij uitnodigen",
        description: "Selecteer eerst een kalender",
        variant: "destructive",
      });
      return;
    }

    try {
      // First check if user exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        toast({
          title: "Gebruiker niet gevonden",
          description: "Er is geen gebruiker gevonden met dit e-mailadres",
          variant: "destructive",
        });
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('calendar_members')
        .select('id')
        .eq('calendar_id', calendarId)
        .eq('user_id', userData.id)
        .single();

      if (existingMember) {
        toast({
          title: "Gebruiker is al lid",
          description: "Deze gebruiker heeft al toegang tot deze kalender",
          variant: "destructive",
        });
        return;
      }

      // If fullName is provided, update the user's full_name
      if (fullName) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ full_name: fullName })
          .eq('id', userData.id);

        if (updateError) {
          console.error('Error updating user name:', updateError);
        }
      }

      const { error } = await supabase
        .from('calendar_members')
        .insert({
          calendar_id: calendarId,
          user_id: userData.id,
          role: role,
          invited_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Uitnodiging verstuurd",
        description: `${email} is uitgenodigd als ${role}`,
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
    removeMember,
    updateMemberRole,
    refetch: fetchMembers
  };
};
