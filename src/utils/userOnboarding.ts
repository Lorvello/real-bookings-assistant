
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

/**
 * 🚀 AUTOMATIC CAL.COM USER CREATION
 * ==================================
 * 
 * Deze utility functie wordt aangeroepen na successful user registration
 * om automatisch een Cal.com user aan te maken via de API
 */

export const createCalcomUserForNewUser = async (user: User, profileData?: any) => {
  try {
    console.log('[UserOnboarding] Creating Cal.com user for:', user.id);

    const { data, error } = await supabase.functions.invoke('create-calcom-user', {
      body: {
        user_id: user.id,
        email: user.email,
        full_name: profileData?.full_name || user.user_metadata?.full_name,
        business_name: profileData?.business_name || user.user_metadata?.business_name
      }
    });

    if (error) {
      console.error('[UserOnboarding] Error creating Cal.com user:', error);
      return false;
    }

    if (data.success) {
      console.log('[UserOnboarding] Cal.com user created successfully:', data.cal_user_id);
      return true;
    } else {
      console.error('[UserOnboarding] Cal.com user creation failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('[UserOnboarding] Unexpected error:', error);
    return false;
  }
};

export const syncCalcomBookingsForUser = async (user: User) => {
  try {
    console.log('[UserOnboarding] Syncing Cal.com bookings for:', user.id);

    const { data, error } = await supabase.functions.invoke('calcom-bookings', {
      body: {
        action: 'list',
        user_id: user.id
      }
    });

    if (error) {
      console.error('[UserOnboarding] Error syncing bookings:', error);
      return false;
    }

    console.log('[UserOnboarding] Bookings synced successfully');
    return true;
  } catch (error) {
    console.error('[UserOnboarding] Unexpected sync error:', error);
    return false;
  }
};
