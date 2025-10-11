import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TeamMemberService } from '@/types/database';

interface TeamMemberServiceWithDetails extends TeamMemberService {
  service_types?: any;
}

export const useTeamMemberServices = (calendarId?: string, userId?: string) => {
  const { user } = useAuth();
  const [services, setServices] = useState<TeamMemberServiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeamMemberServices = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('team_member_services')
        .select(`
          *,
          service_types(*)
        `);
      
      if (calendarId) query = query.eq('calendar_id', calendarId);
      if (userId) query = query.eq('user_id', userId);
      
      const { data, error } = await query;
      
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching team member services:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignService = async (userId: string, serviceTypeId: string, calendarId: string) => {
    const { error } = await supabase
      .from('team_member_services')
      .insert({ user_id: userId, service_type_id: serviceTypeId, calendar_id: calendarId });
    
    if (error) throw error;
    await fetchTeamMemberServices();
  };

  const assignMultipleMembers = async (
    serviceTypeId: string,
    userIds: string[],
    calendarId: string
  ) => {
    if (userIds.length === 0) return;
    
    const assignments = userIds.map(userId => ({
      user_id: userId,
      service_type_id: serviceTypeId,
      calendar_id: calendarId
    }));
    
    const { error } = await supabase
      .from('team_member_services')
      .insert(assignments);
    
    if (error) throw error;
    await fetchTeamMemberServices();
  };

  const unassignService = async (assignmentId: string) => {
    const { error } = await supabase
      .from('team_member_services')
      .delete()
      .eq('id', assignmentId);
    
    if (error) throw error;
    await fetchTeamMemberServices();
  };

  useEffect(() => {
    if (user) {
      fetchTeamMemberServices();
    }
  }, [calendarId, userId, user]);

  return {
    services,
    loading,
    assignService,
    assignMultipleMembers,
    unassignService,
    refetch: fetchTeamMemberServices
  };
};
