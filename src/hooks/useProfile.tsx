
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserProfile } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

const PROFILE_CACHE_KEY = 'userProfile';
const PROFILE_CACHE_VERSION = '2.0'; // Updated after grace_period_end migration

export const useProfile = () => {
  const { user } = useAuth();
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

  const fetchProfile = async () => {
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
      
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update profile",
          variant: "destructive",
        });
        return;
      }

      // Fetch fresh profile data first, then show success
      await fetchProfile();
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
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
