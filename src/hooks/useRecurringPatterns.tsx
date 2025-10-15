
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type RecurringAvailabilityRow = Database['public']['Tables']['recurring_availability']['Row'];
type RecurringAvailabilityInsert = Database['public']['Tables']['recurring_availability']['Insert'];
type RecurringAvailabilityUpdate = Database['public']['Tables']['recurring_availability']['Update'];

export interface RecurringPattern extends RecurringAvailabilityRow {
  pattern_type: 'weekly' | 'biweekly' | 'monthly' | 'seasonal';
}

export const useRecurringPatterns = (calendarId?: string) => {
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPatterns = async () => {
    if (!calendarId) {
      setPatterns([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('recurring_availability')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatterns((data || []) as RecurringPattern[]);
    } catch (error) {
      console.error('Error fetching recurring patterns:', error);
      toast({
        title: "Error loading patterns",
        description: "Could not load recurring patterns",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPattern = async (pattern: RecurringAvailabilityInsert): Promise<RecurringPattern> => {
    if (!calendarId) throw new Error('No calendar selected');

    try {
      const { data, error } = await supabase
        .from('recurring_availability')
        .insert({
          calendar_id: calendarId,
          pattern_type: pattern.pattern_type,
          pattern_name: pattern.pattern_name!,
          start_date: pattern.start_date!,
          end_date: pattern.end_date,
          schedule_data: pattern.schedule_data!,
          is_active: pattern.is_active ?? true
        })
        .select()
        .single();

      if (error) throw error;
      
      const newPattern = data as RecurringPattern;
      setPatterns(prev => [newPattern, ...prev]);
      toast({
        title: "Pattern created",
        description: "Recurring availability pattern created successfully",
      });
      
      return newPattern;
    } catch (error) {
      console.error('Error creating pattern:', error);
      toast({
        title: "Error creating pattern",
        description: "Could not create pattern",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePattern = async (id: string, updates: RecurringAvailabilityUpdate): Promise<RecurringPattern> => {
    try {
      const { data, error } = await supabase
        .from('recurring_availability')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const updatedPattern = data as RecurringPattern;
      setPatterns(prev => prev.map(p => p.id === id ? updatedPattern : p));
      toast({
        title: "Pattern updated",
        description: "Recurring pattern updated successfully",
      });
      
      return updatedPattern;
    } catch (error) {
      console.error('Error updating pattern:', error);
      toast({
        title: "Error updating pattern",
        description: "Could not update pattern",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePattern = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setPatterns(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Pattern deleted",
        description: "Recurring pattern deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting pattern:', error);
      toast({
        title: "Error deleting pattern",
        description: "Could not delete pattern",
        variant: "destructive",
      });
      throw error;
    }
  };

  const togglePattern = async (id: string, isActive: boolean) => {
    await updatePattern(id, { is_active: isActive });
  };

  useEffect(() => {
    setLoading(true);
    fetchPatterns();
  }, [calendarId]);

  return {
    patterns,
    loading,
    createPattern,
    updatePattern,
    deletePattern,
    togglePattern,
    refetch: fetchPatterns
  };
};
