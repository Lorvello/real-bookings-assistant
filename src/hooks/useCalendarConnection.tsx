
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

export const useCalendarConnection = (user: User | null) => {
  const { toast } = useToast();

  const checkAndCreateCalendarConnection = async () => {
    if (!user) return;

    try {
      // Get current session to check for Google provider tokens
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData.session?.provider_token && user.app_metadata?.provider === 'google') {
        console.log('Google user detected, checking for calendar connection...');
        
        // Check if calendar connection already exists
        const { data: existingConnection } = await supabase
          .from('calendar_connections')
          .select('id')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .eq('is_active', true)
          .maybeSingle();

        if (!existingConnection) {
          console.log('No calendar connection found, creating one...');
          
          // Create calendar connection with current session tokens
          const { error: connectionError } = await supabase
            .from('calendar_connections')
            .insert({
              user_id: user.id,
              provider: 'google',
              provider_account_id: user.user_metadata?.sub || user.id,
              access_token: sessionData.session.provider_token,
              refresh_token: sessionData.session.provider_refresh_token || null,
              expires_at: sessionData.session.expires_at ? new Date(sessionData.session.expires_at * 1000).toISOString() : null,
              is_active: true
            });

          if (!connectionError) {
            console.log('Calendar connection created successfully');
            return true;
          } else {
            console.error('Error creating calendar connection:', connectionError);
          }
        }
      }
    } catch (error) {
      console.error('Error checking/creating calendar connection:', error);
    }
    return false;
  };

  useEffect(() => {
    if (user) {
      checkAndCreateCalendarConnection();
    }
  }, [user]);

  return { checkAndCreateCalendarConnection };
};
