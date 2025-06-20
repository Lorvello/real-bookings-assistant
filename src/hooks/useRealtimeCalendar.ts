
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone: string | null;
  status: string;
  service_type_id: string | null;
  service_types?: {
    name: string;
    color: string;
    duration: number;
  } | null;
}

interface AvailabilityRule {
  id: string;
  schedule_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface AvailabilityOverride {
  id: string;
  calendar_id: string;
  date: string;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  reason?: string;
}

export function useRealtimeCalendar(calendarId: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
  const [availabilityOverrides, setAvailabilityOverrides] = useState<AvailabilityOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!calendarId) return;

    initializeData();
    setupRealtimeSubscriptions();

    return () => {
      cleanupSubscriptions();
    };
  }, [calendarId]);

  const initializeData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [bookingsData, rulesData, overridesData] = await Promise.all([
        fetchBookings(calendarId),
        fetchAvailabilityRules(calendarId),
        fetchAvailabilityOverrides(calendarId)
      ]);

      setBookings(bookingsData || []);
      setAvailabilityRules(rulesData || []);
      setAvailabilityOverrides(overridesData || []);
    } catch (err) {
      console.error('Error initializing calendar data:', err);
      setError('Failed to load calendar data');
      toast({
        title: "Fout bij laden",
        description: "Kon kalendergegevens niet laden. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookings = async (calendarId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        customer_name,
        customer_phone,
        status,
        service_type_id,
        service_types (
          name,
          color,
          duration
        )
      `)
      .eq('calendar_id', calendarId)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  };

  const fetchAvailabilityRules = async (calendarId: string) => {
    const { data, error } = await supabase
      .from('availability_rules')
      .select(`
        id,
        schedule_id,
        day_of_week,
        start_time,
        end_time,
        is_available,
        availability_schedules!inner (
          calendar_id
        )
      `)
      .eq('availability_schedules.calendar_id', calendarId);

    if (error) throw error;
    return data;
  };

  const fetchAvailabilityOverrides = async (calendarId: string) => {
    const { data, error } = await supabase
      .from('availability_overrides')
      .select('*')
      .eq('calendar_id', calendarId)
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  };

  const setupRealtimeSubscriptions = () => {
    // Bookings subscription
    const bookingsChannel = supabase
      .channel(`bookings_${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          handleBookingChange(payload);
        }
      )
      .subscribe();

    // Availability overrides subscription
    const overridesChannel = supabase
      .channel(`overrides_${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability_overrides',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          handleOverrideChange(payload);
        }
      )
      .subscribe();

    // WhatsApp webhook notifications
    const webhookChannel = supabase
      .channel(`webhooks_${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_events',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          handleWebhookEvent(payload);
        }
      )
      .subscribe();
  };

  const cleanupSubscriptions = () => {
    supabase.removeAllChannels();
  };

  const handleBookingChange = (payload: any) => {
    console.log('Booking change detected:', payload);
    
    try {
      switch (payload.eventType) {
        case 'INSERT':
          setBookings(prev => {
            // Avoid duplicates
            if (prev.some(b => b.id === payload.new.id)) return prev;
            return [...prev, payload.new].sort((a, b) => 
              new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );
          });
          
          toast({
            title: "Nieuwe afspraak! 📅",
            description: `${payload.new.customer_name} heeft een afspraak geboekt`,
          });
          break;

        case 'UPDATE':
          setBookings(prev => prev.map(booking => 
            booking.id === payload.new.id ? { ...booking, ...payload.new } : booking
          ));
          
          if (payload.old.status !== payload.new.status) {
            const statusMessages = {
              confirmed: 'Afspraak bevestigd ✅',
              cancelled: 'Afspraak geannuleerd ❌',
              'no-show': 'No-show geregistreerd 🚫',
              completed: 'Afspraak voltooid ✨'
            };
            
            toast({
              title: "Status gewijzigd",
              description: statusMessages[payload.new.status] || `Status: ${payload.new.status}`,
            });
          }
          break;

        case 'DELETE':
          setBookings(prev => prev.filter(booking => booking.id !== payload.old.id));
          toast({
            title: "Afspraak verwijderd",
            description: "Een afspraak is verwijderd uit de kalender",
            variant: "destructive",
          });
          break;
      }
    } catch (error) {
      console.error('Error handling booking change:', error);
    }
  };

  const handleOverrideChange = (payload: any) => {
    console.log('Override change detected:', payload);
    
    try {
      switch (payload.eventType) {
        case 'INSERT':
          setAvailabilityOverrides(prev => {
            if (prev.some(o => o.id === payload.new.id)) return prev;
            return [...prev, payload.new].sort((a, b) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
          });
          
          toast({
            title: "Uitzondering toegevoegd 📝",
            description: `${payload.new.is_available ? 'Aangepaste tijden' : 'Gesloten dag'} voor ${payload.new.date}`,
          });
          break;

        case 'UPDATE':
          setAvailabilityOverrides(prev => prev.map(override => 
            override.id === payload.new.id ? { ...override, ...payload.new } : override
          ));
          
          toast({
            title: "Uitzondering gewijzigd",
            description: `Uitzondering voor ${payload.new.date} is bijgewerkt`,
          });
          break;

        case 'DELETE':
          setAvailabilityOverrides(prev => prev.filter(override => override.id !== payload.old.id));
          toast({
            title: "Uitzondering verwijderd",
            description: `Uitzondering voor ${payload.old.date} is verwijderd`,
          });
          break;
      }
    } catch (error) {
      console.error('Error handling override change:', error);
    }
  };

  const handleWebhookEvent = (payload: any) => {
    console.log('Webhook event detected:', payload);
    
    try {
      const eventData = payload.new;
      
      if (eventData.event_type === 'booking.created') {
        const bookingPayload = eventData.payload;
        
        toast({
          title: "WhatsApp Booking! 💬",
          description: `${bookingPayload.customer?.name || 'Klant'} heeft geboekt via WhatsApp`,
        });
      } else if (eventData.event_type === 'whatsapp.message.received') {
        toast({
          title: "Nieuw WhatsApp bericht 📱",
          description: "Er is een nieuw bericht ontvangen",
        });
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
    }
  };

  const refetchData = () => {
    initializeData();
  };

  return {
    bookings,
    availabilityRules,
    availabilityOverrides,
    isLoading,
    error,
    refetchData
  };
}
