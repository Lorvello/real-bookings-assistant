
import { User } from '@supabase/supabase-js';
import { useProfileManager } from './useProfileManager';
import { useSetupProgress } from './useSetupProgress';
import { useCalendarConnection } from './useCalendarConnection';

export const useProfile = (user: User | null) => {
  const { profile, updateProfile, refetchProfile } = useProfileManager(user);
  const { setupProgress, loading, updateSetupProgress, refetchSetupProgress } = useSetupProgress(user);
  const { checkCalcomConnection } = useCalendarConnection(user);

  return {
    profile,
    setupProgress,
    loading,
    updateProfile,
    updateSetupProgress,
    refetch: () => {
      if (user) {
        refetchProfile();
        refetchSetupProgress();
      }
    }
  };
};
