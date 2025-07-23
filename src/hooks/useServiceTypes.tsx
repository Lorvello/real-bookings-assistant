
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceType {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number | null;
  color: string;
  is_active: boolean;
  calendar_id: string;
}

export const useServiceTypes = (calendarId?: string) => {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServiceTypes();
  }, [calendarId]);

  const fetchServiceTypes = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('service_types')
        .select('*')
        .order('created_at', { ascending: true });

      // If calendarId is provided, filter by it
      if (calendarId) {
        query = query.eq('calendar_id', calendarId);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      
      setServiceTypes(data || []);
    } catch (error) {
      console.error('Error fetching service types:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    serviceTypes,
    loading,
    refetch: fetchServiceTypes
  };
};
