
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useToast } from '@/hooks/use-toast';

export interface ServiceType {
  id: string;
  calendar_id: string;
  name: string;
  description?: string;
  duration: number;
  price?: number;
  color: string;
  is_active: boolean;
  max_attendees: number;
  preparation_time: number;
  cleanup_time: number;
  created_at: string;
}

export const useServiceTypes = () => {
  const { selectedCalendar } = useCalendarContext();
  const { toast } = useToast();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCalendar?.id) {
      fetchServiceTypes();
    }
  }, [selectedCalendar]);

  const fetchServiceTypes = async () => {
    if (!selectedCalendar?.id) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching service types for calendar:', selectedCalendar.id);

      const { data, error: fetchError } = await supabase
        .from('service_types')
        .select('*')
        .eq('calendar_id', selectedCalendar.id)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Error fetching service types:', fetchError);
        setError('Fout bij ophalen service types');
        return;
      }

      console.log('Service types data:', data);

      setServiceTypes(data || []);
    } catch (error) {
      console.error('Error in fetchServiceTypes:', error);
      setError('Er is een fout opgetreden bij het laden van service types');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultServiceType = async () => {
    if (!selectedCalendar?.id) return;

    try {
      const { data, error } = await supabase
        .from('service_types')
        .insert({
          calendar_id: selectedCalendar.id,
          name: 'Standaard Afspraak',
          description: 'Standaard service type',
          duration: 30,
          price: 50.00,
          color: '#3B82F6',
          is_active: true,
          max_attendees: 1,
          preparation_time: 0,
          cleanup_time: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating default service type:', error);
        toast({
          title: "Fout",
          description: "Kon geen standaard service type aanmaken",
          variant: "destructive",
        });
        return;
      }

      console.log('Created default service type:', data);
      setServiceTypes([data]);

      toast({
        title: "Succes",
        description: "Standaard service type aangemaakt",
      });

    } catch (error) {
      console.error('Error creating default service type:', error);
    }
  };

  const createServiceType = async (serviceTypeData: Partial<ServiceType>) => {
    if (!selectedCalendar?.id) return;

    try {
      const insertData = {
        calendar_id: selectedCalendar.id,
        name: serviceTypeData.name || '',
        description: serviceTypeData.description || null,
        duration: serviceTypeData.duration || 30,
        price: serviceTypeData.price || null,
        color: serviceTypeData.color || '#3B82F6',
        is_active: serviceTypeData.is_active ?? true,
        max_attendees: serviceTypeData.max_attendees || 1,
        preparation_time: serviceTypeData.preparation_time || 0,
        cleanup_time: serviceTypeData.cleanup_time || 0
      };

      const { data, error } = await supabase
        .from('service_types')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating service type:', error);
        toast({
          title: "Fout",
          description: "Fout bij aanmaken service type",
          variant: "destructive",
        });
        return;
      }

      setServiceTypes(prev => [...prev, data]);
      toast({
        title: "Succes",
        description: "Service type succesvol aangemaakt",
      });

      return data;
    } catch (error) {
      console.error('Error creating service type:', error);
    }
  };

  const updateServiceType = async (id: string, updates: Partial<ServiceType>) => {
    try {
      const { data, error } = await supabase
        .from('service_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating service type:', error);
        toast({
          title: "Fout",
          description: "Fout bij bijwerken service type",
          variant: "destructive",
        });
        return;
      }

      setServiceTypes(prev => 
        prev.map(st => st.id === id ? data : st)
      );

      toast({
        title: "Succes",
        description: "Service type succesvol bijgewerkt",
      });

      return data;
    } catch (error) {
      console.error('Error updating service type:', error);
    }
  };

  const deleteServiceType = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_types')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting service type:', error);
        toast({
          title: "Fout",
          description: "Fout bij verwijderen service type",
          variant: "destructive",
        });
        return;
      }

      setServiceTypes(prev => prev.filter(st => st.id !== id));
      toast({
        title: "Succes",
        description: "Service type succesvol verwijderd",
      });
    } catch (error) {
      console.error('Error deleting service type:', error);
    }
  };

  return {
    serviceTypes,
    loading,
    error,
    createServiceType,
    updateServiceType,
    deleteServiceType,
    refetch: fetchServiceTypes,
    hasCalendar: !!selectedCalendar?.id
  };
};
