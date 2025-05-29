
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  client_phone: string;
  client_name: string | null;
  last_message: string | null;
  last_message_at: string;
  status: 'active' | 'archived' | 'blocked';
  created_at: string;
  updated_at: string;
}

export const useConversations = (user: User | null) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      setConversations([]);
      setLoading(false);
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      console.log('Fetching conversations for user:', user.id);
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching conversations:', error);
        toast({
          title: "Error",
          description: "Failed to load conversations",
          variant: "destructive",
        });
        return;
      }

      console.log('Conversations fetched:', data);
      // Cast the data to proper types
      const typedConversations = (data || []).map(conv => ({
        ...conv,
        status: conv.status as 'active' | 'archived' | 'blocked'
      }));
      setConversations(typedConversations);
    } catch (error) {
      console.error('Unexpected error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    conversations,
    loading,
    refetch: fetchConversations
  };
};
