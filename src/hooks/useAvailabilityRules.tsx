import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AvailabilityRule } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useAvailabilityRules = (scheduleId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingRules, setSyncingRules] = useState<Set<string>>(new Set());

  // Memoize fetchRules to prevent unnecessary re-renders
  const fetchRules = useCallback(async () => {
    if (!scheduleId) {
      setRules([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching availability rules for schedule:', scheduleId);
      
      const { data, error } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('day_of_week', { ascending: true });

      if (error) {
        console.error('Error fetching availability rules:', error);
        setError(error.message);
        setRules([]);
        return;
      }

      console.log('Successfully fetched availability rules:', data);
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching availability rules:', error);
      setError('An unexpected error occurred');
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    if (user && scheduleId) {
      fetchRules();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    } else {
      setRules([]);
      setLoading(false);
    }
  }, [user, scheduleId, fetchRules]);

  const setupRealtimeSubscription = useCallback(() => {
    if (!scheduleId) return () => {};

    // Create a unique channel name to prevent conflicts between multiple hook instances
    const channelName = `availability_rules_${scheduleId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability_rules',
          filter: `schedule_id=eq.${scheduleId}`
        },
        (payload) => {
          console.log('Availability rule realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setRules(prev => {
              const newRule = payload.new as AvailabilityRule;
              // Check if rule already exists to prevent duplicates
              if (prev.some(rule => rule.id === newRule.id)) {
                return prev;
              }
              return [...prev, newRule].sort((a, b) => a.day_of_week - b.day_of_week);
            });
          } else if (payload.eventType === 'UPDATE') {
            setRules(prev => prev.map(rule => 
              rule.id === payload.new.id ? payload.new as AvailabilityRule : rule
            ));
          } else if (payload.eventType === 'DELETE') {
            setRules(prev => prev.filter(rule => rule.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scheduleId]);

  const createRule = async (ruleData: Partial<AvailabilityRule>) => {
    if (!scheduleId) {
      console.error('Cannot create rule: scheduleId is missing');
      return null;
    }

    // Validate required fields
    if (ruleData.day_of_week === undefined || !ruleData.start_time || !ruleData.end_time) {
      console.error('Cannot create rule: missing required fields', ruleData);
      toast({
        title: "Error",
        description: "Day of week, start time, and end time are required",
        variant: "destructive",
      });
      return null;
    }

    try {
      setError(null);
      
      console.log('Creating availability rule:', {
        schedule_id: scheduleId,
        day_of_week: ruleData.day_of_week,
        start_time: ruleData.start_time,
        end_time: ruleData.end_time,
        is_available: ruleData.is_available ?? true
      });

      const { data, error } = await supabase
        .from('availability_rules')
        .insert({
          schedule_id: scheduleId,
          day_of_week: ruleData.day_of_week,
          start_time: ruleData.start_time,
          end_time: ruleData.end_time,
          is_available: ruleData.is_available ?? true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating rule:', error);
        setError(error.message);
        
        // Don't show toast for duplicate key errors as they're handled automatically
        if (!error.message.includes('duplicate key')) {
          toast({
            title: "Error",
            description: `Failed to create availability rule: ${error.message}`,
            variant: "destructive",
          });
        }
        return null;
      }

      console.log('Successfully created availability rule:', data);
      return data;
    } catch (error: any) {
      console.error('Error creating availability rule:', error);
      setError('An unexpected error occurred');
      
      if (!error.message?.includes('duplicate key')) {
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
      return null;
    }
  };

  const updateRule = async (id: string, updates: Partial<AvailabilityRule>) => {
    try {
      setError(null);
      setSyncingRules(prev => new Set(prev).add(id));
      
      const { error } = await supabase
        .from('availability_rules')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating rule:', error);
        setError(error.message);
        toast({
          title: "Error",
          description: `Failed to update availability rule: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating availability rule:', error);
      setError('An unexpected error occurred');
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      setSyncingRules(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const deleteRule = async (id: string) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('availability_rules')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting rule:', error);
        setError(error.message);
        toast({
          title: "Error",
          description: `Failed to delete availability rule: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting availability rule:', error);
      setError('An unexpected error occurred');
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  // Intelligent sync function that only updates changed rules instead of deleting all
  const syncRules = useCallback(async (dayRules: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }>) => {
    if (!scheduleId) return false;

    try {
      setError(null);
      
      // Get current rules for comparison
      const currentRules = rules.filter(rule => 
        dayRules.some(dayRule => dayRule.day_of_week === rule.day_of_week)
      );

      // Create a map of current rules by day_of_week for easy lookup
      const currentRulesMap = new Map(
        currentRules.map(rule => [rule.day_of_week, rule])
      );

      const promises: Promise<any>[] = [];

      for (const dayRule of dayRules) {
        const existingRule = currentRulesMap.get(dayRule.day_of_week);

        if (existingRule) {
          // Check if update is needed
          const needsUpdate = 
            existingRule.start_time !== dayRule.start_time ||
            existingRule.end_time !== dayRule.end_time ||
            existingRule.is_available !== dayRule.is_available;

          if (needsUpdate) {
            promises.push(updateRule(existingRule.id, dayRule));
          }
        } else {
          // Create new rule
          promises.push(createRule({ ...dayRule, schedule_id: scheduleId }));
        }
      }

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Error syncing rules:', error);
      setError('Failed to sync availability rules');
      return false;
    }
  }, [scheduleId, rules]);

  return {
    rules,
    loading,
    error,
    syncingRules,
    createRule,
    updateRule,
    deleteRule,
    syncRules,
    refetch: fetchRules
  };
};
