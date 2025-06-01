
/**
 * 🔗 CALENDAR CONNECTION HOOK - SIMPLIFIED
 * =======================================
 * 
 * This hook is now simplified to remove automatic Google OAuth detection
 * and calendar connection creation. All calendar connections should be 
 * manually initiated from the dashboard.
 */

import { User } from '@supabase/supabase-js';

/**
 * Simplified hook that no longer automatically creates calendar connections
 * for Google OAuth users. This prevents the dashboard hijacking issue.
 * 
 * @param user - Authenticated user object
 * @returns Empty object for compatibility
 */
export const useCalendarConnection = (user: User | null) => {
  // No longer performs any automatic setup
  // All calendar connections must be manually initiated from dashboard
  
  return { 
    // Empty function for compatibility with existing code
    checkAndCreateCalendarConnection: async () => false
  };
};
