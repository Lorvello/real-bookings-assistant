
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BusinessAvailabilityOverview {
  user_id: string;
  business_name: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_whatsapp: string | null;
  business_type: string | null;
  business_description: string | null;
  business_street: string | null;
  business_number: string | null;
  business_postal: string | null;
  business_city: string | null;
  business_country: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  calendar_id: string;
  calendar_name: string;
  calendar_slug: string;
  timezone: string;
  calendar_active: boolean;
  calendar_description: string | null;
  calendar_color: string;
  booking_window_days: number;
  minimum_notice_hours: number;
  slot_duration: number;
  buffer_time: number;
  max_bookings_per_day: number | null;
  allow_waitlist: boolean;
  confirmation_required: boolean;
  whatsapp_bot_active: boolean;
  service_type_id: string | null;
  service_name: string | null;
  service_description: string | null;
  service_duration: number | null;
  service_price: number | null;
  service_color: string | null;
  service_active: boolean | null;
  max_attendees: number | null;
  preparation_time: number | null;
  cleanup_time: number | null;
  schedule_id: string | null;
  schedule_name: string | null;
  is_default_schedule: boolean | null;
  availability_rules: any[] | null;
  recent_overrides: any[] | null;
  current_month_stats: any | null;
  last_updated: string;
  calendar_created_at: string;
  business_created_at: string;
}

export interface BusinessSlot {
  business_name: string;
  calendar_name: string;
  service_name: string;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  is_available: boolean;
  service_price: number;
  service_duration: number;
}

export const useBusinessAvailabilityOverview = () => {
  const [data, setData] = useState<BusinessAvailabilityOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBusinessOverview = async (filters?: {
    business_name?: string;
    calendar_slug?: string;
    business_type?: string;
    city?: string;
  }) => {
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

  const refreshOverview = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('refresh_business_availability_overview');
      
      if (error) {
        console.error('Error refreshing overview:', error);
        toast({
          title: "Fout bij verversen overzicht",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Overzicht ververst",
          description: "Het bedrijfsoverzicht is succesvol ververst",
        });
      }
    } catch (error) {
      console.error('Error refreshing overview:', error);
      toast({
        title: "Fout bij verversen overzicht",
        description: "Er is een onverwachte fout opgetreden",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return {
    data,
    loading,
    fetchBusinessOverview,
    getBusinessSlots,
    refreshOverview
  };
};
