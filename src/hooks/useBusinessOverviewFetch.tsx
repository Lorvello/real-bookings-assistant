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
      // Build query from table with filters
      let query = supabase
        .from('business_overview')
        .select('*')
        .eq('calendar_active', true);

      // Apply filters
      if (filters?.business_name) {
        query = query.ilike('business_name', `%${filters.business_name}%`);
      }
      if (filters?.business_type) {
        query = query.eq('business_type', filters.business_type);
      }
      if (filters?.city) {
        query = query.ilike('business_city', `%${filters.city}%`);
      }
      if (filters?.calendar_slug) {
        query = query.eq('calendar_slug', filters.calendar_slug);
      }

      const { data: rawData, error } = await query.order('business_name');

      if (error) {
        throw error;
      }

      // Parse JSON fields from JSONB columns
      const overviewData = (rawData || []).map((item: any) => ({
        ...item,
        available_slots: Array.isArray(item.available_slots) ? item.available_slots : [],
        upcoming_bookings: Array.isArray(item.upcoming_bookings) ? item.upcoming_bookings : [],
        services: Array.isArray(item.services) ? item.services : [],
        opening_hours: typeof item.opening_hours === 'object' ? item.opening_hours : {},
      }));

      setData(overviewData);
      setLoading(false);
      return overviewData;
    } catch (error) {
      console.error('Error fetching business overview:', error);
      toast({
        title: "Fout bij ophalen bedrijfsoverzicht",
        description: error instanceof Error ? error.message : "Er ging iets mis",
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