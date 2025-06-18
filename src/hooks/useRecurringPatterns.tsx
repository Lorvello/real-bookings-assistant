
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RecurringPattern {
  id: string;
  calendar_id: string;
  pattern_type: 'weekly' | 'biweekly' | 'monthly' | 'seasonal';
  pattern_name: string;
  start_date: string;
  end_date?: string;
  schedule_data: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useRecurringPatterns = (calendarId: string) => {
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPatterns = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_availability')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatterns(data || []);
    } catch (error) {
      console.error('Error fetching recurring patterns:', error);
      toast({
        title: "Fout bij laden patronen",
        description: "Kon terugkerende patronen niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPattern = async (pattern: Partial<RecurringPattern>) => {
    try {
      const { data, error } = await supabase
        .from('recurring_availability')
        .insert([{
          calendar_id: calendarId,
          ...pattern
        }])
        .select()
        .single();

      if (error) throw error;
      
      setPatterns(prev => [data, ...prev]);
      toast({
        title: "Patroon aangemaakt",
        description: "Terugkerend beschikbaarheidspatroon succesvol aangemaakt",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating pattern:', error);
      toast({
        title: "Fout bij aanmaken patroon",
        description: "Kon patroon niet aanmaken",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePattern = async (id: string, updates: Partial<RecurringPattern>) => {
    try {
      const { data, error } = await supabase
        .from('recurring_availability')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setPatterns(prev => prev.map(p => p.id === id ? data : p));
      toast({
        title: "Patroon bijgewerkt",
        description: "Terugkerend patroon succesvol bijgewerkt",
      });
      
      return data;
    } catch (error) {
      console.error('Error updating pattern:', error);
      toast({
        title: "Fout bij bijwerken patroon",
        description: "Kon patroon niet bijwerken",
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
        title: "Patroon verwijderd",
        description: "Terugkerend patroon succesvol verwijderd",
      });
    } catch (error) {
      console.error('Error deleting pattern:', error);
      toast({
        title: "Fout bij verwijderen patroon",
        description: "Kon patroon niet verwijderen",
        variant: "destructive",
      });
      throw error;
    }
  };

  const togglePattern = async (id: string, isActive: boolean) => {
    await updatePattern(id, { is_active: isActive });
  };

  useEffect(() => {
    if (calendarId) {
      fetchPatterns();
    }
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
