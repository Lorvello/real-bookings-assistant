
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

export const useCalendarConnection = (user: User | null) => {
  const { toast } = useToast();

  const checkAndCreateCalendarConnection = async () => {
    if (!user) return false;

    try {
      console.log('[CalendarConnection] Checking calendar connection for user:', user.id);
      
      // Get current session to check for Google provider tokens
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData.session?.provider_token && user.app_metadata?.provider === 'google') {
        console.log('[CalendarConnection] Google user with provider token detected');
        
        // Check if calendar connection already exists and is active
        const { data: existingConnection } = await supabase
          .from('calendar_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .eq('is_active', true)
          .maybeSingle();

        if (!existingConnection) {
          console.log('[CalendarConnection] No active connection found, creating one...');
          
          // Create calendar connection with current session tokens
          const { error: connectionError } = await supabase
            .from('calendar_connections')
            .upsert({
              user_id: user.id,
              provider: 'google',
              provider_account_id: user.user_metadata?.sub || user.id,
              access_token: sessionData.session.provider_token,
              refresh_token: sessionData.session.provider_refresh_token || null,
              expires_at: sessionData.session.expires_at ? 
                new Date(sessionData.session.expires_at * 1000).toISOString() : null,
              is_active: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,provider'
            });

          if (!connectionError) {
            console.log('[CalendarConnection] Calendar connection created successfully');
            
            // Update setup progress
            await supabase
              .from('setup_progress')
              .upsert({
                user_id: user.id,
                calendar_linked: true,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id'
              });

            // Trigger initial calendar sync
            try {
              await supabase.functions.invoke('sync-calendar-events', {
                body: { user_id: user.id }
              });
              console.log('[CalendarConnection] Calendar sync triggered successfully');
            } catch (syncError) {
              console.warn('[CalendarConnection] Calendar sync failed:', syncError);
            }

            return true;
          } else {
            console.error('[CalendarConnection] Error creating calendar connection:', connectionError);
          }
        } else {
          console.log('[CalendarConnection] Active calendar connection already exists');
          
          // Update tokens if they're different
          if (existingConnection.access_token !== sessionData.session.provider_token) {
            console.log('[CalendarConnection] Updating existing connection with new tokens');
            
            await supabase
              .from('calendar_connections')
              .update({
                access_token: sessionData.session.provider_token,
                refresh_token: sessionData.session.provider_refresh_token || existingConnection.refresh_token,
                expires_at: sessionData.session.expires_at ? 
                  new Date(sessionData.session.expires_at * 1000).toISOString() : existingConnection.expires_at,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingConnection.id);
          }
          
          return true;
        }
      } else {
        console.log('[CalendarConnection] Not a Google user or no provider token available');
      }
    } catch (error) {
      console.error('[CalendarConnection] Error checking/creating calendar connection:', error);
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
