
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sanitizeUserInput } from '@/utils/inputSanitization';
import { logger } from '@/utils/logger';

interface BookingData {
  calendarSlug: string;
  serviceTypeId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
}

interface BookingResult {
  success: boolean;
  booking?: any;
  error?: string;
}

export const usePublicBookingCreation = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createBooking = async (bookingData: BookingData): Promise<BookingResult> => {
    setLoading(true);
    
    try {
      // Sanitize all user inputs
      const sanitizedData = {
        ...bookingData,
        customerName: sanitizeUserInput(bookingData.customerName, 'text'),
        customerEmail: sanitizeUserInput(bookingData.customerEmail, 'email'),
        customerPhone: bookingData.customerPhone ? sanitizeUserInput(bookingData.customerPhone, 'phone') : undefined,
        notes: bookingData.notes ? sanitizeUserInput(bookingData.notes, 'text') : undefined
      };

      // Validate required fields
      if (!sanitizedData.customerName || !sanitizedData.customerEmail) {
        throw new Error('Name and email are required');
      }

      // Email format validation
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(sanitizedData.customerEmail)) {
        throw new Error('Please enter a valid email address');
      }

      // Time validation
      const now = new Date();
      if (sanitizedData.startTime <= now) {
        throw new Error('Booking time must be in the future');
      }

      if (sanitizedData.endTime <= sanitizedData.startTime) {
        throw new Error('End time must be after start time');
      }

      logger.info('Creating secured public booking', { 
        component: 'usePublicBookingCreation',
        calendarSlug: sanitizedData.calendarSlug,
        customerEmail: sanitizedData.customerEmail.substring(0, 3) + '***'
      });

      // Get the calendar ID based on the slug
      const { data: calendar, error: calendarError } = await supabase
        .from('calendars')
        .select('id')
        .eq('slug', sanitizedData.calendarSlug)
        .eq('is_active', true)
        .single();

      if (calendarError || !calendar) {
        logger.error('Calendar lookup failed', calendarError, { 
          component: 'usePublicBookingCreation',
          slug: sanitizedData.calendarSlug 
        });
        throw new Error('Calendar not found or inactive');
      }

      // Validate booking security using database function
      const { data: isValid } = await supabase.rpc('validate_booking_security', {
        p_calendar_id: calendar.id,
        p_service_type_id: sanitizedData.serviceTypeId,
        p_start_time: sanitizedData.startTime.toISOString(),
        p_end_time: sanitizedData.endTime.toISOString(),
        p_customer_email: sanitizedData.customerEmail
      });

      if (!isValid) {
        logger.error('Booking security validation failed', null, { 
          component: 'usePublicBookingCreation',
          calendarId: calendar.id 
        });
        throw new Error('Invalid booking parameters or time conflict detected');
      }

      // Create the booking with sanitized data
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          calendar_id: calendar.id,
          service_type_id: sanitizedData.serviceTypeId,
          customer_name: sanitizedData.customerName,
          customer_email: sanitizedData.customerEmail,
          customer_phone: sanitizedData.customerPhone,
          start_time: sanitizedData.startTime.toISOString(),
          end_time: sanitizedData.endTime.toISOString(),
          notes: sanitizedData.notes,
          status: 'pending',
          confirmation_token: crypto.randomUUID()
        })
        .select()
        .single();

      if (bookingError) {
        logger.error('Booking creation failed', bookingError, { 
          component: 'usePublicBookingCreation',
          calendarId: calendar.id 
        });
        throw new Error(bookingError.message || 'Failed to create booking');
      }

      // Log successful booking creation
      logger.success('Booking created successfully', { 
        component: 'usePublicBookingCreation',
        bookingId: booking.id 
      });

      toast({
        title: "Booking Created",
        description: "Your booking has been created successfully.",
      });

      return {
        success: true,
        booking
      };
    } catch (error: any) {
      logger.error('Booking creation error', error, { 
        component: 'usePublicBookingCreation' 
      });

      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });

      return {
        success: false,
        error: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    createBooking,
    loading
  };
};
