import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { ServiceType } from '@/types/calendar';

// Helper function to transform database data to our interface
const transformServiceType = (data: any): ServiceType => {
  return {
    ...data,
    installment_options: data.installment_options ? 
      (typeof data.installment_options === 'string' ? 
        JSON.parse(data.installment_options) : data.installment_options) : [],
    tax_enabled: data.tax_enabled || false,
    tax_behavior: data.tax_behavior || 'exclusive',
    tax_code: data.tax_code || ''
  };
};

// Helper function to transform our interface to database format
const transformForDatabase = (data: any) => {
  const transformed = { ...data };
  if (transformed.installment_options) {
    transformed.installment_options = JSON.stringify(transformed.installment_options);
  }
  // Ensure tax fields are properly set
  transformed.tax_enabled = transformed.tax_enabled || false;
  transformed.tax_behavior = transformed.tax_behavior || 'exclusive';
  transformed.tax_code = transformed.tax_code || null;
  return transformed;
};

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

        const transformedData = uniqueServiceTypes.map(transformServiceType);
        setServiceTypes(transformedData.sort((a, b) => 
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
        
        const transformedData = (data || []).map(transformServiceType);
        setServiceTypes(transformedData);
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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      const serviceDataForDb = transformForDatabase({
        ...serviceData,
        user_id: userData.user.id
      });

      const { data, error } = await supabase
        .from('service_types')
        .insert([serviceDataForDb])
        .select('*')
        .single();

      if (error) {
        console.error('Supabase error creating service type:', error);
        throw error;
      }

      const transformedData = transformServiceType(data);
      setServiceTypes(prev => [transformedData, ...prev]);

      // Auto-sync with Stripe if service has a price
      if (serviceData.price && serviceData.price > 0) {
        try {
          await supabase.functions.invoke('sync-service-stripe-prices', {
            body: {
              service_type_id: data.id,
              test_mode: true
            }
          });
          toast({
            title: "Service created with Stripe sync",
            description: "Service created and automatically synced with Stripe.",
          });
        } catch (syncError) {
          console.warn('Auto-sync with Stripe failed:', syncError);
          toast({
            title: "Service created",
            description: "Service created successfully. Stripe sync will retry automatically.",
          });
        }
      } else {
        toast({
          title: "Service created",
          description: "The service type was created successfully.",
        });
      }
      
      return transformedData;
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
      const serviceDataForDb = transformForDatabase(serviceData);
      const { error } = await supabase
        .from('service_types')
        .update(serviceDataForDb)
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      setServiceTypes(prev => prev.map(service => 
        service.id === id ? { ...service, ...serviceData } : service
      ));

      // Auto-sync with Stripe if service has a price
      const updatedService = serviceTypes.find(s => s.id === id);
      if (updatedService && serviceData.price && serviceData.price > 0) {
        try {
          await supabase.functions.invoke('sync-service-stripe-prices', {
            body: {
              service_type_id: id,
              test_mode: true
            }
          });
        } catch (syncError) {
          console.warn('Auto-sync with Stripe failed:', syncError);
        }
      }

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