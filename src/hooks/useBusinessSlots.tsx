
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BusinessSlot } from '@/types/businessAvailability';

export const useBusinessSlots = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getBusinessSlots = async (
    calendarSlug: string,
    serviceTypeId?: string,
    startDate: Date = new Date(),
    days: number = 14
  ): Promise<BusinessSlot[]> => {
    setLoading(true);

    try {
      const { data: slotsData, error } = await supabase.rpc('get_business_available_slots', {
        p_calendar_slug: calendarSlug,
        p_service_type_id: serviceTypeId || null,
        p_start_date: startDate.toISOString().split('T')[0],
        p_days: days
      });

      if (error) {
        console.error('Error fetching business slots:', error);
        toast({
          title: "Fout bij ophalen beschikbare tijden",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return [];
      }

      setLoading(false);
      return slotsData || [];
    } catch (error) {
      console.error('Error fetching business slots:', error);
      toast({
        title: "Fout bij ophalen beschikbare tijden",
        description: "Er is een onverwachte fout opgetreden",
        variant: "destructive",
      });
      setLoading(false);
      return [];
    }
  };

  return {
    loading,
    getBusinessSlots
  };
};
