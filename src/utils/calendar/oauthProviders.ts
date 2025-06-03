
import { supabase } from '@/integrations/supabase/client';

// Simplified for Cal.com only
export const getCalcomOAuthProvider = async () => {
  try {
    const { data, error } = await supabase
      .from('oauth_providers')
      .select('*')
      .eq('provider', 'calcom')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching Cal.com OAuth provider:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error fetching Cal.com OAuth provider:', error);
    return null;
  }
};
