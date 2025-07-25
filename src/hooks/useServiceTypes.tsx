import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { ServiceType } from '@/types/calendar';

export const useServiceTypes = (calendarId?: string, showAllServiceTypes = false) => {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { getActiveCalendarIds } = useCalendarContext();

  const fetchServiceTypes = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setServiceTypes([]);
        setLoading(false);
        return;
      }

      if (calendarId && !showAllServiceTypes) {
        // Fetch service types linked to specific calendar via junction table OR directly via calendar_id
        const { data: junctionData, error: junctionError } = await supabase
          .from('service_types')
          .select(`
            *,
            calendar_service_types!inner(calendar_id)
          `)
          .eq('calendar_service_types.calendar_id', calendarId)
          .eq('user_id', userData.user.id);

        const { data: directData, error: directError } = await supabase
          .from('service_types')
          .select('*')
          .eq('calendar_id', calendarId)
          .eq('user_id', userData.user.id);

        if (junctionError || directError) {
          throw junctionError || directError;
        }

        // Combine both results and remove duplicates
        const allServiceTypes = [...(junctionData || []), ...(directData || [])];
        const uniqueServiceTypes = allServiceTypes.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        );

        setServiceTypes(uniqueServiceTypes.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      } else {
        // Fetch all service types for the current user (including global ones)
        const { data, error } = await supabase
          .from('service_types')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setServiceTypes(data || []);
      }
    } catch (error) {
      console.error('Error fetching service types:', error);
      toast({
        title: "Error fetching service types",
        description: "Could not load service types. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createServiceType = async (serviceData: Omit<ServiceType, 'id'>) => {
    try {
      // Get current user to ensure user_id is set
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      // Ensure user_id is included in service data
      const serviceDataWithUser = {
        ...serviceData,
        user_id: userData.user.id
      };

      const { data, error } = await supabase.from('service_types').insert([serviceDataWithUser]).select('*').single();

      if (error) {
        console.error('Supabase error creating service type:', error);
        throw error;
      }

      setServiceTypes(prev => [data as ServiceType, ...prev]);
      toast({
        title: "Service created",
        description: "The service type was created successfully.",
      });
      
      return data as ServiceType;
    } catch (error) {
      console.error('Error creating service type:', error);
      toast({
        title: "Error creating service",
        description: "Could not create the service type. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateServiceType = async (id: string, serviceData: Partial<ServiceType>) => {
    try {
      const { error } = await supabase.from('service_types').update(serviceData).eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      setServiceTypes(prev => prev.map(service => 
        service.id === id ? { ...service, ...serviceData } : service
      ));

      toast({
        title: "Service updated",
        description: "The service type was updated successfully.",
      });
    } catch (error) {
      console.error('Error updating service type:', error);
      toast({
        title: "Error updating service",
        description: "Could not update the service type. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteServiceType = async (id: string) => {
    try {
      const { error } = await supabase.from('service_types').delete().eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      setServiceTypes(prev => prev.filter(service => service.id !== id));

      toast({
        title: "Service deleted",
        description: "The service type was deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting service type:', error);
      toast({
        title: "Error deleting service",
        description: "Could not delete the service type. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchServiceTypes();
  }, [calendarId, showAllServiceTypes]);

  return {
    serviceTypes,
    loading,
    createServiceType,
    updateServiceType,
    deleteServiceType,
    refetch: fetchServiceTypes
  };
};