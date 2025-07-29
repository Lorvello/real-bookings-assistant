import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserStatus } from '@/contexts/UserStatusContext';

export const useCalendarLimits = () => {
  const { user } = useAuth();
  const { accessControl } = useUserStatus();

  const { data: currentCount = 0, isLoading } = useQuery({
    queryKey: ['calendar-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('calendars')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const maxCalendars = accessControl?.maxCalendars;
  const canCreateMore = maxCalendars === null || currentCount < maxCalendars;

  return {
    currentCount,
    maxCalendars,
    canCreateMore,
    isLoading,
    usageText: maxCalendars === null ? `${currentCount} calendars` : `${currentCount}/${maxCalendars} calendars`
  };
};

export const useWhatsAppLimits = (calendarId?: string) => {
  const { user } = useAuth();
  const { accessControl } = useUserStatus();

  const { data: currentCount = 0, isLoading } = useQuery({
    queryKey: ['whatsapp-contacts-count', user?.id, calendarId],
    queryFn: async () => {
      if (!user) return 0;
      
      let query = supabase
        .from('whatsapp_contacts')
        .select('*', { count: 'exact', head: true });

      // If calendarId is provided, filter by calendar through conversations
      if (calendarId) {
        const { data: conversationContacts } = await supabase
          .from('whatsapp_conversations')
          .select('contact_id')
          .eq('calendar_id', calendarId);
        
        if (conversationContacts && conversationContacts.length > 0) {
          const contactIds = conversationContacts.map(c => c.contact_id);
          query = query.in('id', contactIds);
        } else {
          return 0;
        }
      } else {
        // Count all contacts for user's calendars
        const { data: userCalendars } = await supabase
          .from('calendars')
          .select('id')
          .eq('user_id', user.id);
        
        if (userCalendars && userCalendars.length > 0) {
          const calendarIds = userCalendars.map(c => c.id);
          const { data: conversationContacts } = await supabase
            .from('whatsapp_conversations')
            .select('contact_id')
            .in('calendar_id', calendarIds);
          
          if (conversationContacts && conversationContacts.length > 0) {
            const contactIds = [...new Set(conversationContacts.map(c => c.contact_id))];
            query = query.in('id', contactIds);
          } else {
            return 0;
          }
        } else {
          return 0;
        }
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const maxContacts = accessControl?.maxWhatsAppContacts;
  const canAddMore = maxContacts === null || currentCount < maxContacts;

  return {
    currentCount,
    maxContacts,
    canAddMore,
    isLoading,
    usageText: maxContacts === null ? `${currentCount} contacts` : `${currentCount}/${maxContacts} contacts`
  };
};

export const useTeamMemberLimits = (calendarId?: string) => {
  const { user } = useAuth();
  const { userStatus, accessControl } = useUserStatus();

  const { data: currentCount = 0, isLoading } = useQuery({
    queryKey: ['team-members-count', user?.id, calendarId],
    queryFn: async () => {
      if (!user) return 0;
      
      if (calendarId) {
        // Count all calendar members (owner is already included in calendar_members)
        const { count, error } = await supabase
          .from('calendar_members')
          .select('*', { count: 'exact', head: true })
          .eq('calendar_id', calendarId);

        if (error) throw error;
        return count || 0; // No need to add +1, owner is already counted
      } else {
        // Count unique team members across all user's calendars
        const { data: userCalendars } = await supabase
          .from('calendars')
          .select('id')
          .eq('user_id', user.id);
        
        if (!userCalendars || userCalendars.length === 0) return 0;
        
        const calendarIds = userCalendars.map(c => c.id);
        const { data: members } = await supabase
          .from('calendar_members')
          .select('user_id')
          .in('calendar_id', calendarIds);
        
        if (!members || members.length === 0) return 0;
        
        // Count unique members (owner is already included in calendar_members)
        const uniqueMembers = new Set(members.map(m => m.user_id));
        return uniqueMembers.size;
      }
    },
    enabled: !!user,
  });

  // Use maxTeamMembers from accessControl which already has the correct subscription tier limits
  const maxTeamMembers = accessControl?.maxTeamMembers;
  const canAddMore = maxTeamMembers === null || currentCount < maxTeamMembers;

  return {
    currentCount,
    maxTeamMembers,
    canAddMore,
    isLoading,
    usageText: maxTeamMembers === null ? `${currentCount} team members` : `${currentCount}/${maxTeamMembers} team members`
  };
};