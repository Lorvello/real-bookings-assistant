
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

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSetupProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('setup_progress')
        .select('calendar_linked, availability_configured, booking_rules_set')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching setup progress:', error);
        return;
      }

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
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
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
