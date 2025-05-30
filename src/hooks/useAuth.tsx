
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state change:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle successful login events
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('[Auth] User signed in successfully');
          
          // For Google users, ensure calendar connection is created
          if (session.user.app_metadata?.provider === 'google' && session.provider_token) {
            setTimeout(async () => {
              try {
                await ensureGoogleCalendarConnection(session.user, session);
              } catch (error) {
                console.warn('[Auth] Calendar connection setup failed:', error);
              }
            }, 100);
          }
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('[Auth] User signed out');
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Initial session check:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureGoogleCalendarConnection = async (user: User, session: Session) => {
    try {
      console.log('[Auth] Ensuring Google calendar connection for user:', user.id);
      
      // Check if connection already exists
      const { data: existingConnection } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .maybeSingle();

      if (!existingConnection && session.provider_token) {
        console.log('[Auth] Creating Google calendar connection...');
        
        const { error: connectionError } = await supabase
          .from('calendar_connections')
          .upsert({
            user_id: user.id,
            provider: 'google',
            provider_account_id: user.user_metadata?.sub || user.id,
            access_token: session.provider_token,
            refresh_token: session.provider_refresh_token || null,
            expires_at: session.expires_at ? 
              new Date(session.expires_at * 1000).toISOString() : null,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,provider'
          });

        if (!connectionError) {
          console.log('[Auth] Google calendar connection created successfully');
          
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

          // Trigger calendar sync
          try {
            await supabase.functions.invoke('sync-calendar-events', {
              body: { user_id: user.id }
            });
            console.log('[Auth] Calendar sync triggered');
          } catch (syncError) {
            console.warn('[Auth] Calendar sync failed:', syncError);
          }
        } else {
          console.error('[Auth] Failed to create calendar connection:', connectionError);
        }
      }
    } catch (error) {
      console.error('[Auth] Error in ensureGoogleCalendarConnection:', error);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
    isAuthenticated: !!user
  };
};
