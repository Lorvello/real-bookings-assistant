
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useProfileManager = (user: User | null) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createProfileIfNotExists = async () => {
    if (!user) {
      console.log('[ProfileManager] No user available for profile creation');
      return;
    }

    try {
      console.log('[ProfileManager] Creating profile for user:', user.id);
      console.log('[ProfileManager] User metadata:', user.user_metadata);
      
      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[ProfileManager] Error checking existing profile:', checkError);
        return;
      }

      if (!existingProfile) {
        console.log('[ProfileManager] Creating new profile...');
        
        const profileData = {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          business_name: user.user_metadata?.business_name || null,
        };

        console.log('[ProfileManager] Profile data to insert:', profileData);

        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (profileError) {
          console.error('[ProfileManager] Error creating profile:', profileError);
          toast({
            title: "Profile Creation Error",
            description: "There was an issue creating your profile. Please try refreshing the page.",
            variant: "destructive",
          });
          return;
        }

        console.log('[ProfileManager] Profile created successfully:', newProfile);

        // Create setup progress
        const isGoogleUser = user.app_metadata?.provider === 'google';
        console.log('[ProfileManager] Is Google user:', isGoogleUser);
        
        const { error: setupError } = await supabase
          .from('setup_progress')
          .upsert({
            user_id: user.id,
            calendar_linked: isGoogleUser,
            availability_configured: false,
            booking_rules_set: false,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (setupError) {
          console.error('[ProfileManager] Error creating setup progress:', setupError);
        } else {
          console.log('[ProfileManager] Setup progress created successfully');
        }

        // Create booking settings
        const { error: settingsError } = await supabase
          .from('booking_settings')
          .upsert({
            user_id: user.id,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (settingsError) {
          console.error('[ProfileManager] Error creating booking settings:', settingsError);
        } else {
          console.log('[ProfileManager] Booking settings created successfully');
        }

        setProfile(newProfile);
      } else {
        console.log('[ProfileManager] Profile already exists:', existingProfile);
        setProfile(existingProfile);
      }
    } catch (error) {
      console.error('[ProfileManager] Unexpected error in createProfileIfNotExists:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while setting up your profile.",
        variant: "destructive",
      });
    }
  };

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('[ProfileManager] Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[ProfileManager] Error fetching profile:', error);
        return;
      }

      if (!data) {
        console.log('[ProfileManager] No profile found, creating one...');
        await createProfileIfNotExists();
        return;
      }

      console.log('[ProfileManager] Profile fetched successfully:', data);
      setProfile(data);
    } catch (error) {
      console.error('[ProfileManager] Unexpected error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    try {
      console.log('[ProfileManager] Updating profile with:', updates);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[ProfileManager] Error updating profile:', error);
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('[ProfileManager] Profile updated successfully:', data);
      setProfile(data);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('[ProfileManager] Unexpected error updating profile:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating your profile.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    updateProfile,
    refetchProfile: fetchProfile
  };
};
