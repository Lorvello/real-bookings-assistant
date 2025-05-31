
import { supabase } from '@/integrations/supabase/client';
import { OAuthProvider } from '@/types/calendar';

export const getOAuthProvider = async (provider: 'google' | 'microsoft'): Promise<OAuthProvider | null> => {
  try {
    const { data, error } = await supabase
      .from('oauth_providers')
      .select('*')
      .eq('provider', provider)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching OAuth provider:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error fetching OAuth provider:', error);
    return null;
  }
};
