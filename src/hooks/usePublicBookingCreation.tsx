
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BookingData {
  calendarSlug: string;
  serviceTypeId: string;
  customerName: string;
  customerEmail?: string; // Made optional
  customerPhone?: string;
  startTime: Date;
  notes?: string;
}

interface BookingResult {
  success: boolean;
  bookingId?: string;
  confirmationToken?: string;
  startTime?: string;
  endTime?: string;
  error?: string;
}

export const usePublicBookingCreation = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createBooking = async (bookingData: BookingData): Promise<BookingResult> => {
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('create_booking', {
        p_calendar_slug: bookingData.calendarSlug,
        p_service_type_id: bookingData.serviceTypeId,
        p_customer_name: bookingData.customerName,
        p_start_time: bookingData.startTime.toISOString(),
        p_customer_email: bookingData.customerEmail || null,
        p_customer_phone: bookingData.customerPhone || '',
        p_notes: bookingData.notes || ''
      });

      if (error) {
        console.error('Booking error:', error);
        toast({
          title: "Booking gefaald",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, error: error.message };
      }

      // Type cast the JSON response to our expected structure
      const result = data as unknown as BookingResult & {
        booking_id?: string;
        confirmation_token?: string;
        start_time?: string;
        end_time?: string;
      };

      if (!result?.success) {
        toast({
          title: "Booking gefaald",
          description: result?.error || "Booking kon niet worden aangemaakt",
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, error: result?.error || "Booking gefaald" };
      }

      toast({
        title: "Booking succesvol!",
        description: bookingData.customerEmail 
          ? "Je afspraak is bevestigd. Je ontvangt een bevestigingsmail."
          : "Je afspraak is bevestigd.",
      });

      setLoading(false);
      return {
        success: true,
        bookingId: result.booking_id,
        confirmationToken: result.confirmation_token,
        startTime: result.start_time,
        endTime: result.end_time
      };
    } catch (error) {
      console.error('Booking creation error:', error);
      toast({
        title: "Booking gefaald",
        description: "Er is een onverwachte fout opgetreden",
        variant: "destructive",
      });
      setLoading(false);
      return { success: false, error: "Onverwachte fout" };
    }
  };

  return {
    createBooking,
    loading
  };
};
