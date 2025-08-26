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
      // Business overview functionality temporarily disabled due to materialized view removal
      // This prevents build errors while maintaining API compatibility
      const overviewData: BusinessAvailabilityOverview[] = [];
      
      setData(overviewData);
      setLoading(false);
      return overviewData;
    } catch (error) {
      toast({
        title: "Fout bij ophalen bedrijfsoverzicht",
        description: "Feature tijdelijk uitgeschakeld",
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