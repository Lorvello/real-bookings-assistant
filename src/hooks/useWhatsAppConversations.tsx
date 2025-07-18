
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppConversation } from '@/types/whatsapp';
import { useWhatsAppConversationUpdates } from './useWhatsAppConversationUpdates';

const getMockConversations = () => [
  {
    id: 'mock-conv-1',
    calendar_id: 'mock-calendar',
    contact_id: 'mock-1',
    status: 'active' as const,
    context: {},
    last_message_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    whatsapp_contacts: {
      id: 'mock-1',
      phone_number: '+31612345678',
      display_name: 'Emma van der Berg',
      first_name: 'Emma',
      last_name: 'van der Berg',
      profile_picture_url: null,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'mock-conv-2',
    calendar_id: 'mock-calendar',
    contact_id: 'mock-2',
    status: 'active' as const,
    context: {},
    last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    whatsapp_contacts: {
      id: 'mock-2',
      phone_number: '+31623456789',
      display_name: 'Lars Janssen',
      first_name: 'Lars',
      last_name: 'Janssen',
      profile_picture_url: null,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'mock-conv-3',
    calendar_id: 'mock-calendar',
    contact_id: 'mock-3',
    status: 'closed' as const,
    context: {},
    last_message_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    whatsapp_contacts: {
      id: 'mock-3',
      phone_number: '+31634567890',
      display_name: 'Sophie de Vries',
      first_name: 'Sophie',
      last_name: 'de Vries',
      profile_picture_url: null,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'mock-conv-4',
    calendar_id: 'mock-calendar',
    contact_id: 'mock-4',
    status: 'active' as const,
    context: {},
    last_message_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    whatsapp_contacts: {
      id: 'mock-4',
      phone_number: '+31645678901',
      display_name: 'Daan Peters',
      first_name: 'Daan',
      last_name: 'Peters',
      profile_picture_url: null,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'mock-conv-5',
    calendar_id: 'mock-calendar',
    contact_id: 'mock-5',
    status: 'active' as const,
    context: {},
    last_message_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    whatsapp_contacts: {
      id: 'mock-5',
      phone_number: '+31656789012',
      display_name: 'Lisa van Dijk',
      first_name: 'Lisa',
      last_name: 'van Dijk',
      profile_picture_url: null,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'mock-conv-6',
    calendar_id: 'mock-calendar',
    contact_id: 'mock-6',
    status: 'closed' as const,
    context: {},
    last_message_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    whatsapp_contacts: {
      id: 'mock-6',
      phone_number: '+31667890123',
      display_name: 'Max Bakker',
      first_name: 'Max',
      last_name: 'Bakker',
      profile_picture_url: null,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
];

export function useWhatsAppConversations(calendarId: string) {
  // Set up real-time updates
  useWhatsAppConversationUpdates(calendarId);

  return useQuery({
    queryKey: ['whatsapp-conversations', calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          whatsapp_contacts (
            id,
            phone_number,
            display_name,
            first_name,
            last_name,
            profile_picture_url,
            created_at
          )
        `)
        .eq('calendar_id', calendarId)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // If no real data and calendarId exists, return mock data for trial users
      if (!data || data.length === 0) {
        return getMockConversations();
      }
      
      return data;
    },
    enabled: !!calendarId,
  });
}

export function useCreateWhatsAppConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversation: Partial<WhatsAppConversation>) => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .insert([conversation])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-conversations', data.calendar_id] 
      });
    },
  });
}

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      status 
    }: { 
      conversationId: string; 
      status: WhatsAppConversation['status'];
    }) => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .update({ status })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-conversations', data?.calendar_id] 
      });
    },
  });
}
