
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const syncCalendarEvents = async (user: User): Promise<boolean> => {
  if (!user) return false;

  try {
    const { data, error } = await supabase.functions.invoke('sync-calcom-bookings', {
      body: { user_id: user.id }
    });

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error syncing Cal.com bookings:', error);
    throw error;
  }
};

export const handleCalcomRegistration = async (user: User): Promise<boolean> => {
  if (!user) return false;

  try {
    console.log('Creating Cal.com user for:', user.id);

    const { data, error } = await supabase.functions.invoke('create-calcom-user', {
      body: { 
        user_id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
      }
    });

    if (error) {
      console.error('Cal.com user creation error:', error);
      throw error;
    }

    if (data.success) {
      return true;
    } else {
      throw new Error(data.error || 'Cal.com user creation failed');
    }
  } catch (error: any) {
    console.error('Cal.com registration error:', error);
    throw error;
  }
};
