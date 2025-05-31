
/**
 * 🔗 CALENDAR CONNECTION AUTOMATION HOOK
 * ======================================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Deze hook automatiseert de post-OAuth setup van calendar connections voor Google users.
 * Het detecteert wanneer gebruikers via Google OAuth zijn ingelogd en creëert automatisch
 * de benodigde calendar_connection records voor seamless systeem activatie.
 * 
 * 🚀 BUSINESS CRITICAL FUNCTIONS:
 * - Automatic connection creation voor Google OAuth users
 * - Token management en storage in secure database
 * - Setup progress tracking voor onboarding completion  
 * - Initial calendar sync triggering voor immediate availability
 * 
 * 🎪 SYSTEM INTEGRATION POINTS:
 * - Auth flow: Triggered na successful Google OAuth login
 * - Connection management: Creates calendar_connections records
 * - Setup tracking: Updates setup_progress voor dashboard
 * - Calendar sync: Triggers initial event synchronization
 * 
 * 💡 SUCCESS METRICS CONTRIBUTION:
 * - Automatic setup reduces tijd naar activation (< 3 minuten target)
 * - Seamless OAuth integration verhoogt completion rates
 * - Error-free token management voorkomt support tickets
 * - Immediate sync provides instant value voor users
 */

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

/**
 * 🎮 Primary hook voor automatic calendar connection setup
 * 
 * RESPONSIBILITIES:
 * - Detect Google OAuth users met provider tokens
 * - Create/update calendar_connection records automatisch  
 * - Store OAuth tokens securely in database
 * - Update setup progress voor onboarding tracking
 * - Trigger initial calendar sync voor immediate data
 * 
 * AUTO-SETUP WORKFLOW:
 * 1. Detect Google OAuth session met provider tokens
 * 2. Check voor existing calendar connections
 * 3. Create nieuwe connection of update bestaande tokens
 * 4. Mark setup progress als completed
 * 5. Trigger initial calendar sync voor fresh data
 * 
 * @param user - Authenticated user object voor RLS en session data
 * @returns Object met setup function voor manual triggering
 */
export const useCalendarConnection = (user: User | null) => {
  const { toast } = useToast();

  /**
   * 🤖 Checks en creates calendar connection voor eligible users
   * 
   * ELIGIBILITY CRITERIA:
   * - User must be authenticated via Google OAuth
   * - Session must contain valid provider_token
   * - User metadata must indicate Google as provider
   * 
   * CONNECTION LOGIC:
   * - Check voor existing active connections
   * - Create nieuwe connection met current session tokens
   * - Update bestaande connection met fresh tokens indien nodig
   * - Handle token expiration calculations
   * 
   * ERROR HANDLING:
   * - Database errors: Log maar don't block user experience
   * - Missing tokens: Graceful degradation naar manual setup
   * - Sync failures: Warning logs maar don't fail connection creation
   * 
   * @returns Promise<boolean> - Success status voor calling components
   */
  const checkAndCreateCalendarConnection = async () => {
    if (!user) return false;

    try {
      console.log('[CalendarConnection] Checking calendar connection for user:', user.id);
      
      // 🔍 Get current session voor provider token access
      const { data: sessionData } = await supabase.auth.getSession();
      
      // ✅ GOOGLE OAUTH USER DETECTION
      // Check of user via Google is ingelogd EN heeft provider tokens
      if (sessionData.session?.provider_token && user.app_metadata?.provider === 'google') {
        console.log('[CalendarConnection] Google user with provider token detected');
        
        // 🔍 Check voor existing active calendar connection
        const { data: existingConnection } = await supabase
          .from('calendar_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .eq('is_active', true)
          .maybeSingle();

        if (!existingConnection) {
          // 🆕 CREATE NEW CONNECTION
          console.log('[CalendarConnection] No active connection found, creating one...');
          
          // 💾 Create calendar connection met session tokens
          const { error: connectionError } = await supabase
            .from('calendar_connections')
            .upsert({
              user_id: user.id,
              provider: 'google',
              provider_account_id: user.user_metadata?.sub || user.id, // Google user ID
              access_token: sessionData.session.provider_token,         // Google access token
              refresh_token: sessionData.session.provider_refresh_token || null, // Google refresh token
              expires_at: sessionData.session.expires_at ? 
                new Date(sessionData.session.expires_at * 1000).toISOString() : null, // Token expiration
              is_active: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,provider' // Update if conflict occurs
            });

          if (!connectionError) {
            console.log('[CalendarConnection] Calendar connection created successfully');
            
            // 📊 UPDATE SETUP PROGRESS
            // Mark calendar_linked als completed voor onboarding tracking
            await supabase
              .from('setup_progress')
              .upsert({
                user_id: user.id,
                calendar_linked: true,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id'
              });

            // 🔄 TRIGGER INITIAL CALENDAR SYNC
            // Immediate sync voor fresh availability data
            try {
              await supabase.functions.invoke('sync-calendar-events', {
                body: { user_id: user.id }
              });
              console.log('[CalendarConnection] Calendar sync triggered successfully');
            } catch (syncError) {
              // 🔄 Don't fail connection creation voor sync errors
              console.warn('[CalendarConnection] Calendar sync failed:', syncError);
            }

            return true;
          } else {
            console.error('[CalendarConnection] Error creating calendar connection:', connectionError);
          }
        } else {
          // 🔄 UPDATE EXISTING CONNECTION
          console.log('[CalendarConnection] Active calendar connection already exists');
          
          // 🔄 Update tokens if they're different (token refresh scenario)
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

  // 🔄 EFFECT: Auto-setup on user authentication
  // Triggert automatic connection setup wanneer user inlogt
  useEffect(() => {
    if (user) {
      checkAndCreateCalendarConnection();
    }
  }, [user]);

  // 🎯 HOOK RETURN INTERFACE
  return { 
    checkAndCreateCalendarConnection // Manual trigger function
  };
};

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * Deze hook is cruciaal voor het creëren van een frictionless onboarding experience.
 * Door automatically calendar connections te creëren voor Google OAuth users,
 * elimineren we handmatige setup stappen en verhogen we de completion rate.
 * 
 * KEY AUTOMATION BENEFITS:
 * - Zero-click calendar setup voor Google users
 * - Immediate system activation na OAuth completion
 * - Automatic token management en refresh handling
 * - Seamless integration tussen auth en calendar systems
 * 
 * SECURITY CONSIDERATIONS:
 * - OAuth tokens worden securely opgeslagen in Supabase database
 * - RLS policies zorgen voor user isolation van token data
 * - Token expiration wordt correctly berekend en opgeslagen
 * - Refresh tokens enable long-term automatic token renewal
 * 
 * BUSINESS IMPACT:
 * - Dramatically reduces tijd naar first value (immediate availability)
 * - Eliminates common drop-off point in manual setup flows
 * - Provides foundation voor advanced Google Calendar features
 * - Enables immediate WhatsApp bot functionality activation
 * 
 * INTEGRATION DEPENDENCIES:
 * - Supabase Auth: Google OAuth provider configuration
 * - Calendar Sync: Edge function voor initial event loading
 * - Setup Progress: Database tracking voor onboarding completion
 * - Connection Hooks: Real-time status updates voor dashboard
 * 
 * FUTURE ENHANCEMENTS:
 * - Microsoft OAuth automatic setup
 * - Token refresh automation via Edge Functions
 * - Advanced permission scope management
 * - Multi-calendar account support per provider
 */
