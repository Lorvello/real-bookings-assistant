
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

interface SetupProgress {
  calendar_linked: boolean;
  availability_configured: boolean;
  booking_rules_set: boolean;
}

export const useProfile = (user: User | null) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSetupProgress();
    } else {
      setProfile(null);
      setSetupProgress(null);
      setLoading(false);
    }
  }, [user]);

  const createProfileIfNotExists = async () => {
    if (!user) return;

    try {
      console.log('Creating profile for user:', user.id);
      
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing profile:', checkError);
      }

      if (!existingProfile) {
        console.log('Profile does not exist, creating...');
        
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || null,
            business_name: user.user_metadata?.business_name || null
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        } else {
          console.log('Profile created successfully');
        }

        // Create setup progress
        const { error: setupError } = await supabase
          .from('setup_progress')
          .insert({
            user_id: user.id
          });

        if (setupError) {
          console.error('Error creating setup progress:', setupError);
        } else {
          console.log('Setup progress created successfully');
        }

        // Create booking settings
        const { error: settingsError } = await supabase
          .from('booking_settings')
          .insert({
            user_id: user.id
          });

        if (settingsError) {
          console.error('Error creating booking settings:', settingsError);
        } else {
          console.log('Booking settings created successfully');
        }
      }
    } catch (error) {
      console.error('Error in createProfileIfNotExists:', error);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;

    try {
      console.log('Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist, try to create it
        await createProfileIfNotExists();
        return;
      }

      if (!data) {
        console.log('No profile found, creating...');
        await createProfileIfNotExists();
        // Retry fetching after creation
        setTimeout(() => fetchProfile(), 1000);
        return;
      }

      console.log('Profile fetched successfully:', data);
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSetupProgress = async () => {
    if (!user) return;

    try {
      console.log('Fetching setup progress for user:', user.id);
      
      const { data, error } = await supabase
        .from('setup_progress')
        .select('calendar_linked, availability_configured, booking_rules_set')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching setup progress:', error);
        return;
      }

      if (!data) {
        console.log('No setup progress found');
        await createProfileIfNotExists();
        return;
      }

      console.log('Setup progress fetched successfully:', data);
      setSetupProgress(data);
    } catch (error) {
      console.error('Error fetching setup progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    try {
      console.log('Updating profile with:', updates);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Error",
          description: "Failed to update profile",
          variant: "destructive",
        });
        return;
      }

      await fetchProfile();
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error in updateProfile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const updateSetupProgress = async (step: keyof SetupProgress, completed: boolean) => {
    if (!user) return;

    try {
      console.log('Updating setup progress:', step, completed);
      
      const { error } = await supabase
        .from('setup_progress')
        .update({
          [step]: completed,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating setup progress:', error);
        return;
      }

      await fetchSetupProgress();
      toast({
        title: "Progress Updated",
        description: `${step.replace('_', ' ')} has been ${completed ? 'completed' : 'reset'}`,
      });
    } catch (error) {
      console.error('Error updating setup progress:', error);
    }
  };

  return {
    profile,
    setupProgress,
    loading,
    updateProfile,
    updateSetupProgress,
    refetch: () => {
      fetchProfile();
      fetchSetupProgress();
    }
  };
};
