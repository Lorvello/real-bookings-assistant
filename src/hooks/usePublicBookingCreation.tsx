
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BookingData {
  calendarSlug: string;
  serviceTypeId: string;
  customerName: string;
  customerEmail?: string | null;
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
      console.log('🚀 Creating public booking - automatically confirmed:', bookingData);
      
      // Direct insert into bookings table - automatically confirmed by trigger
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          calendar_id: (await supabase
            .from('calendars')
            .select('id')
            .eq('slug', bookingData.calendarSlug)
            .single()).data?.id,
          service_type_id: bookingData.serviceTypeId,
          customer_name: bookingData.customerName,
          customer_email: bookingData.customerEmail,
          customer_phone: bookingData.customerPhone,
          start_time: bookingData.startTime.toISOString(),
          end_time: new Date(bookingData.startTime.getTime() + 30 * 60000).toISOString(), // Default 30 min
          notes: bookingData.notes,
          status: 'confirmed' // Will be enforced by trigger anyway
        })
        .select()
        .single();

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

      // All bookings are now automatically confirmed
      toast({
        title: "Booking succesvol bevestigd!",
        description: bookingData.customerEmail 
          ? "Uw afspraak is direct bevestigd. U ontvangt een bevestigingsmail."
          : "Uw afspraak is direct bevestigd.",
      });

      console.log('✅ Public booking created and automatically confirmed:', data);

      setLoading(false);
      return {
        success: true,
        bookingId: data.id,
        confirmationToken: data.confirmation_token,
        startTime: data.start_time,
        endTime: data.end_time
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
