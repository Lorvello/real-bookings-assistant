
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserProfile } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

const PROFILE_CACHE_KEY = 'userProfile';
const PROFILE_CACHE_VERSION = '2.0'; // Updated after grace_period_end migration

export const useProfile = () => {
  const { user } = useAuth();
  const { t } = useTranslation('notifications');
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    // Initialize with cached profile to prevent loading flash
    if (user?.id) {
      try {
        const cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          const { version, data, userId } = JSON.parse(cached);
          if (version === PROFILE_CACHE_VERSION && userId === user.id) {
            return data;
          }
        }
      } catch (error) {
        console.error('Error loading cached profile:', error);
      }
    }
    return null;
  });
  
  const [loading, setLoading] = useState(() => {
    // If we have cached profile data, start with loading = false
    return !profile;
  });

  const fetchInProgress = useRef(false);

  useEffect(() => {
    if (user) {
      // Check if we need to fetch profile
      const shouldFetch = !profile || profile.id !== user.id;
      
      if (shouldFetch) {
        fetchProfile();
      } else {
        setLoading(false);
      }
    } else {
      setProfile(null);
      setLoading(false);
      localStorage.removeItem(PROFILE_CACHE_KEY);
    }
  }, [user?.id]); // Only depend on user.id to prevent unnecessary refetches

  // useProfile is per-component state (each caller gets its own instance), so a
  // refetch in one place — e.g. the dev dashboard applying a status, or BillingTab —
  // would otherwise leave every OTHER instance (sidebar StatusIndicator, etc.) stale.
  // Re-sync all instances whenever any of them fetches fresh data for this user.
  useEffect(() => {
    const onProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.data && detail?.userId && user?.id && detail.userId === user.id) {
        setProfile(detail.data);
        setLoading(false);
      }
    };
    window.addEventListener('ba:profile-updated', onProfileUpdated);
    return () => window.removeEventListener('ba:profile-updated', onProfileUpdated);
  }, [user?.id]);

  // useCallback with a stable identity so consumers (e.g. UserStatusContext's
  // visibility/focus/interval revalidation, P4-STALEPROFILE fix) can safely list
  // `refetch` in a useEffect dependency array without the effect re-running (and
  // resetting the poll interval) on every render.
  const fetchProfile = useCallback(async () => {
    if (fetchInProgress.current || !user?.id) return;
    
    fetchInProgress.current = true;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      const profileData = data as UserProfile;
      setProfile(profileData);
      
      // Cache the profile data with version and user ID
      try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
          version: PROFILE_CACHE_VERSION,
          data: profileData,
          userId: user.id,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error caching profile:', error);
      }

      // Broadcast so every other useProfile instance re-syncs immediately.
      try {
        window.dispatchEvent(new CustomEvent('ba:profile-updated', {
          detail: { userId: user.id, data: profileData }
        }));
      } catch (_) { /* no window (SSR) */ }

    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [user?.id]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        toast({
          title: t('profile.errorTitle', 'Error'),
          description: t('profile.updateFailedDescription', 'Failed to update profile'),
          variant: "destructive",
        });
        return;
      }

      // Fetch fresh profile data first, then show success
      await fetchProfile();
      
      toast({
        title: t('profile.successTitle', 'Success'),
        description: t('profile.updateSuccessDescription', 'Profile updated successfully'),
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: t('profile.errorTitle', 'Error'),
        description: t('profile.unexpectedErrorDescription', 'An unexpected error occurred'),
        variant: "destructive",
      });
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    refetch: fetchProfile
  };
};
