import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BusinessOverview, BusinessOverviewFilters, CalendarOverview, Service, OpeningHours, UpcomingBooking, CalendarSettings } from '@/types/businessAvailability';

export const useBusinessOverviewFetch = () => {
  const [data, setData] = useState<BusinessOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBusinessOverview = async (filters?: BusinessOverviewFilters) => {
    setLoading(true);

    try {
      // Query from new v2 table with one row per business
      let query = supabase
        .from('business_overview_v2')
        .select('*');

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
      // For calendar_slug filter, we need to filter on JSONB
      if (filters?.calendar_slug) {
        query = query.filter('calendars', 'cs', JSON.stringify([{ calendar_slug: filters.calendar_slug }]));
      }

      const { data: rawData, error } = await query.order('business_name');

      if (error) {
        throw error;
      }

      // Parse and transform the data
      const overviewData: BusinessOverview[] = (rawData || []).map((item: any) => {
        // Parse calendars JSONB
        const calendars: CalendarOverview[] = Array.isArray(item.calendars) 
          ? item.calendars.map((cal: any) => ({
              calendar_id: cal.calendar_id || '',
              calendar_name: cal.calendar_name || null,
              calendar_slug: cal.calendar_slug || null,
              calendar_color: cal.calendar_color || null,
              calendar_description: cal.calendar_description || null,
              calendar_active: cal.calendar_active ?? true,
              timezone: cal.timezone || null,
              services: Array.isArray(cal.services) ? cal.services as Service[] : [],
              opening_hours: typeof cal.opening_hours === 'object' ? cal.opening_hours as OpeningHours : {},
              upcoming_bookings: Array.isArray(cal.upcoming_bookings) ? cal.upcoming_bookings as UpcomingBooking[] : [],
              settings: {
                booking_window_days: cal.settings?.booking_window_days ?? null,
                minimum_notice_hours: cal.settings?.minimum_notice_hours ?? null,
                slot_duration: cal.settings?.slot_duration ?? null,
                buffer_time: cal.settings?.buffer_time ?? null,
                max_bookings_per_day: cal.settings?.max_bookings_per_day ?? null,
                allow_waitlist: cal.settings?.allow_waitlist ?? null,
                confirmation_required: cal.settings?.confirmation_required ?? null,
                whatsapp_bot_active: cal.settings?.whatsapp_bot_active ?? null,
              } as CalendarSettings,
              calendar_bookings: cal.calendar_bookings || 0,
              calendar_revenue: cal.calendar_revenue || 0,
            }))
          : [];

        return {
          user_id: item.user_id,
          business_name: item.business_name,
          business_email: item.business_email,
          business_phone: item.business_phone,
          business_whatsapp: item.business_whatsapp,
          business_type: item.business_type,
          business_description: item.business_description,
          business_street: item.business_street,
          business_number: item.business_number,
          business_postal: item.business_postal,
          business_city: item.business_city,
          business_country: item.business_country,
          website: item.website,
          instagram: item.instagram,
          facebook: item.facebook,
          linkedin: item.linkedin,
          calendars,
          total_calendars: item.total_calendars || 0,
          total_bookings: item.total_bookings || 0,
          total_revenue: item.total_revenue || 0,
          created_at: item.created_at,
          last_updated: item.last_updated,
        };
      });

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
