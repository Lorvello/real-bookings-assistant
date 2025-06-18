
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ServiceType } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useServiceTypes = (calendarId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && calendarId) {
      fetchServiceTypes();
    } else {
      setServiceTypes([]);
      setLoading(false);
    }
  }, [user, calendarId]);

  const fetchServiceTypes = async () => {
    if (!calendarId) return;

    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching service types:', error);
        return;
      }

      setServiceTypes(data || []);
    } catch (error) {
      console.error('Error fetching service types:', error);
    } finally {
      setLoading(false);
    }
  };

  const createServiceType = async (serviceType: Omit<ServiceType, 'id' | 'created_at'>) => {
    if (!calendarId) return;

    try {
      const { error } = await supabase
        .from('service_types')
        .insert({ ...serviceType, calendar_id: calendarId });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create service type",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Service type created successfully",
      });

      await fetchServiceTypes();
    } catch (error) {
      console.error('Error creating service type:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const updateServiceType = async (id: string, updates: Partial<ServiceType>) => {
    try {
      const { error } = await supabase
        .from('service_types')
        .update(updates)
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update service type",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Service type updated successfully",
      });

      await fetchServiceTypes();
    } catch (error) {
      console.error('Error updating service type:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const deleteServiceType = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_types')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete service type",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Service type deleted successfully",
      });

      await fetchServiceTypes();
    } catch (error) {
      console.error('Error deleting service type:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return {
    serviceTypes,
    loading,
    createServiceType,
    updateServiceType,
    deleteServiceType,
    refetch: fetchServiceTypes
  };
};
