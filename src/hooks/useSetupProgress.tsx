
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface SetupProgress {
  calendar_linked: boolean;
  availability_configured: boolean;
  booking_rules_set: boolean;
}

export const useSetupProgress = (user: User | null) => {
  const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSetupProgress = async () => {
    if (!user) return;

    try {
      console.log('Fetching setup progress for user:', user.id);
      
      const { data, error } = await supabase
        .from('setup_progress')
        .select('calendar_linked, availability_configured, booking_rules_set')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching setup progress:', error);
        return;
      }

      if (!data) {
        console.log('No setup progress found, will be created with profile...');
        return;
      }

      console.log('Setup progress fetched successfully:', data);
      setSetupProgress(data);
    } catch (error) {
      console.error('Unexpected error fetching setup progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetupProgress = async (step: keyof SetupProgress, completed: boolean) => {
    if (!user) return;

    try {
      console.log('Updating setup progress:', step, completed);
      
      const { data, error } = await supabase
        .from('setup_progress')
        .update({
          [step]: completed,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating setup progress:', error);
        toast({
          title: "Error",
          description: "Failed to update setup progress. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Setup progress updated successfully:', data);
      setSetupProgress(data);
      
      if (completed) {
        toast({
          title: "Progress Updated",
          description: `${step.replace('_', ' ')} has been completed`,
        });
      }
    } catch (error) {
      console.error('Unexpected error updating setup progress:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSetupProgress();
    } else {
      setSetupProgress(null);
      setLoading(false);
    }
  }, [user]);

  return {
    setupProgress,
    loading,
    updateSetupProgress,
    refetchSetupProgress: fetchSetupProgress
  };
};
