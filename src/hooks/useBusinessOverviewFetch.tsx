
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BusinessAvailabilityOverview, BusinessOverviewFilters } from '@/types/businessAvailability';

export const useBusinessOverviewFetch = () => {
  const [data, setData] = useState<BusinessAvailabilityOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBusinessOverview = async (filters?: BusinessOverviewFilters) => {
    setLoading(true);

    try {
      let query = supabase
        .from('business_availability_overview')
        .select('*');

      if (filters?.business_name) {
        query = query.ilike('business_name', `%${filters.business_name}%`);
      }
      if (filters?.calendar_slug) {
        query = query.eq('calendar_slug', filters.calendar_slug);
      }
      if (filters?.business_type) {
        query = query.eq('business_type', filters.business_type);
      }
      if (filters?.city) {
        query = query.ilike('business_city', `%${filters.city}%`);
      }

      const { data: overviewData, error } = await query
        .order('business_name')
        .limit(50);

      if (error) {
        console.error('Error fetching business overview:', error);
        toast({
          title: "Fout bij ophalen bedrijfsoverzicht",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return [];
      }

      setData(overviewData || []);
      setLoading(false);
      return overviewData || [];
    } catch (error) {
      console.error('Error fetching business overview:', error);
      toast({
        title: "Fout bij ophalen bedrijfsoverzicht",
        description: "Er is een onverwachte fout opgetreden",
        variant: "destructive",
      });
      setLoading(false);
      return [];
    }
  };

  return {
    data,
    loading,
    fetchBusinessOverview
  };
};
