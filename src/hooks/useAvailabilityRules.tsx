
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AvailabilityRule } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useAvailabilityRules = (scheduleId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && scheduleId) {
      fetchRules();
    } else {
      setRules([]);
      setLoading(false);
    }
  }, [user, scheduleId]);

  const fetchRules = async () => {
    if (!scheduleId) return;

    try {
      const { data, error } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('day_of_week', { ascending: true });

      if (error) {
        console.error('Error fetching availability rules:', error);
        return;
      }

      setRules(data || []);
    } catch (error) {
      console.error('Error fetching availability rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRule = async (ruleData: Partial<AvailabilityRule>) => {
    if (!scheduleId) return;

    try {
      const { error } = await supabase
        .from('availability_rules')
        .insert({
          ...ruleData,
          schedule_id: scheduleId
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create availability rule",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Availability rule created successfully",
      });

      await fetchRules();
    } catch (error) {
      console.error('Error creating availability rule:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const updateRule = async (id: string, updates: Partial<AvailabilityRule>) => {
    try {
      const { error } = await supabase
        .from('availability_rules')
        .update(updates)
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update availability rule",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Availability rule updated successfully",
      });

      await fetchRules();
    } catch (error) {
      console.error('Error updating availability rule:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('availability_rules')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete availability rule",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Availability rule deleted successfully",
      });

      await fetchRules();
    } catch (error) {
      console.error('Error deleting availability rule:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return {
    rules,
    loading,
    createRule,
    updateRule,
    deleteRule,
    refetch: fetchRules
  };
};
