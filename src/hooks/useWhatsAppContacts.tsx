
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppContact } from '@/types/whatsapp';

const getMockContacts = (): WhatsAppContact[] => [
  {
    id: 'mock-1',
    phone_number: '+31612345678',
    display_name: 'Emma van der Berg',
    first_name: 'Emma',
    last_name: 'van der Berg',
    linked_customer_email: 'emma.vandenberg@email.com',
    profile_picture_url: null,
    metadata: {},
    last_seen_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-2',
    phone_number: '+31623456789',
    display_name: 'Lars Janssen',
    first_name: 'Lars',
    last_name: 'Janssen',
    linked_customer_email: 'lars.janssen@email.com',
    profile_picture_url: null,
    metadata: {},
    last_seen_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-3',
    phone_number: '+31634567890',
    display_name: 'Sophie de Vries',
    first_name: 'Sophie',
    last_name: 'de Vries',
    linked_customer_email: 'sophie.devries@email.com',
    profile_picture_url: null,
    metadata: {},
    last_seen_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  }
];

export function useWhatsAppContacts(calendarId?: string) {
  return useQuery({
    queryKey: ['whatsapp-contacts', calendarId],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_contacts')
        .select(`
          *,
          whatsapp_conversations!inner (
            calendar_id
          )
        `);

      if (calendarId) {
        query = query.eq('whatsapp_conversations.calendar_id', calendarId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // If no real data and calendarId exists, return mock data for trial users
      if (!data || data.length === 0) {
        return getMockContacts();
      }
      
      return data as WhatsAppContact[];
    },
    enabled: !!calendarId,
  });
}

export function useCreateWhatsAppContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Omit<WhatsAppContact, 'id' | 'created_at' | 'updated_at'> & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    }) => {
      const { data, error } = await supabase
        .from('whatsapp_contacts')
        .insert([contact])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
    },
  });
}
