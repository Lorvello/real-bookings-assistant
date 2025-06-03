
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { createCalcomConnection } from './connectionManager';

export const initiateCalcomRegistration = async (user: User): Promise<boolean> => {
  try {
    console.log('[CalcomIntegration] Starting Cal.com registration for user:', user.id);

    // Create Cal.com user via edge function
    const { data, error } = await supabase.functions.invoke('create-calcom-user', {
      body: { 
        user_id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
      }
    });

    if (error) {
      throw new Error(`Cal.com registration failed: ${error.message}`);
    }

    if (data.success && data.cal_user_id) {
      // Create calendar connection record
      const connection = await createCalcomConnection(user, data.cal_user_id);
      
      if (connection) {
        console.log('[CalcomIntegration] Cal.com user registered successfully:', data.cal_user_id);
        return true;
      }
    }

    throw new Error(data.error || 'Cal.com registration failed');

  } catch (error) {
    console.error('[CalcomIntegration] Registration failed:', error);
    throw error;
  }
};

export const syncCalcomBookings = async (user: User): Promise<boolean> => {
  try {
    console.log('[CalcomIntegration] Starting Cal.com booking sync for user:', user.id);

    const { data, error } = await supabase.functions.invoke('sync-calcom-bookings', {
      body: { user_id: user.id }
    });

    if (error) {
      console.error('[CalcomIntegration] Sync failed:', error);
      return false;
    }

    console.log('[CalcomIntegration] Sync completed:', data);
    return true;

  } catch (error) {
    console.error('[CalcomIntegration] Unexpected sync error:', error);
    return false;
  }
};

export const disconnectCalcomProvider = async (user: User, connectionId: string): Promise<boolean> => {
  try {
    console.log('[CalcomIntegration] Disconnecting Cal.com provider:', connectionId);

    // Mark connection as inactive
    const { error: updateError } = await supabase
      .from('calendar_connections')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[CalcomIntegration] Failed to deactivate connection:', updateError);
      return false;
    }

    // Remove associated calendar events
    const { error: eventsError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('user_id', user.id);

    if (eventsError) {
      console.error('[CalcomIntegration] Failed to remove events:', eventsError);
      // Don't return false here as connection is already deactivated
    }

    console.log('[CalcomIntegration] Successfully disconnected Cal.com provider');
    return true;

  } catch (error) {
    console.error('[CalcomIntegration] Disconnect error:', error);
    return false;
  }
};
