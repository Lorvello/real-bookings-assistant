
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticBookings } from '@/hooks/useOptimisticBookings';
import { bookingSchema, BookingFormData } from '@/components/booking/bookingSchema';
import { 
  calculateDuration, 
  calculateBookingTimes, 
  buildBookingNotes, 
  calculateEndTimeFromService 
} from '@/components/booking/bookingUtils';

interface ServiceType {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface UseBookingFormProps {
  calendarId: string;
  onBookingCreated?: () => void;
  onClose: () => void;
}

export function useBookingForm({ calendarId, onBookingCreated, onClose }: UseBookingFormProps) {
  const { toast } = useToast();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [autoUpdateEndTime, setAutoUpdateEndTime] = useState(true);
  const { createBooking, isCreating } = useOptimisticBookings(calendarId);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      title: '',
      location: '',
      date: new Date(),
      startTime: '13:00',
      endTime: '14:00',
      description: '',
      hasReminder: false,
      reminderTiming: '30',
      serviceTypeId: '',
      isInternal: true,
    },
  });

  const hasReminder = form.watch('hasReminder');
  const selectedServiceType = form.watch('serviceTypeId');
  const startTime = form.watch('startTime');
  const endTime = form.watch('endTime');

  // Load service types for the calendar
  useEffect(() => {
    const loadServiceTypes = async () => {
      if (!calendarId) return;

      console.log('Loading service types for calendar:', calendarId);
      
      const { data, error } = await supabase
        .from('service_types')
        .select('id, name, duration, price')
        .eq('calendar_id', calendarId)
        .eq('is_active', true);

      if (error) {
        console.error('Error loading service types:', error);
        return;
      }

      console.log('Loaded service types:', data);
      setServiceTypes(data || []);
      
      // Auto-select first service type if available
      if (data && data.length > 0 && !selectedServiceType) {
        form.setValue('serviceTypeId', data[0].id);
        
        // Auto-set end time based on service duration only if auto-update is enabled
        if (autoUpdateEndTime) {
          const startTime = form.getValues('startTime');
          if (startTime) {
            const endTime = calculateEndTimeFromService(startTime, data[0].duration);
            form.setValue('endTime', endTime);
          }
        }
      }
    };

    loadServiceTypes();
  }, [calendarId, selectedServiceType, form, autoUpdateEndTime]);

  // Update end time when service type or start time changes (only if auto-update is enabled)
  useEffect(() => {
    if (!autoUpdateEndTime) return;

    const subscription = form.watch((value, { name }) => {
      if ((name === 'serviceTypeId' || name === 'startTime') && value.serviceTypeId && value.startTime) {
        const selectedService = serviceTypes.find(s => s.id === value.serviceTypeId);
        if (selectedService) {
          const endTime = calculateEndTimeFromService(value.startTime, selectedService.duration);
          form.setValue('endTime', endTime);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, serviceTypes, autoUpdateEndTime]);

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    form.setValue(field, value);
    setAutoUpdateEndTime(false); // User manually changed time
  };

  const handleServiceTypeChange = (value: string) => {
    form.setValue('serviceTypeId', value);
    
    // If auto-update is enabled, calculate end time based on new service type
    if (autoUpdateEndTime) {
      const selectedService = serviceTypes.find(s => s.id === value);
      if (selectedService) {
        const startTime = form.getValues('startTime');
        if (startTime) {
          const endTime = calculateEndTimeFromService(startTime, selectedService.duration);
          form.setValue('endTime', endTime);
        }
      }
    }
  };

  const getDuration = () => calculateDuration(startTime, endTime);

  const onSubmit = async (data: BookingFormData) => {
    try {
      console.log('=== BOOKING CREATION DEBUG ===');
      console.log('Form data:', data);
      console.log('Calendar ID:', calendarId);
      console.log('Duration calculated:', getDuration(), 'minutes');

      // Validate duration
      const duration = getDuration();
      if (duration <= 0) {
        toast({
          title: "Ongeldige tijden",
          description: "Eindtijd moet na starttijd zijn",
          variant: "destructive",
        });
        return;
      }

      if (duration > 480) { // 8 hours max
        toast({
          title: "Te lange afspraak",
          description: "Afspraken kunnen maximaal 8 uur duren",
          variant: "destructive",
        });
        return;
      }

      // Calculate start and end times
      const { startTime, endTime } = calculateBookingTimes(data);

      console.log('Calculated times:', { startTime, endTime });

      // Build notes content
      const notesContent = buildBookingNotes(data, duration);

      // Create the booking data object
      const bookingData = {
        calendar_id: calendarId,
        service_type_id: data.serviceTypeId || undefined,
        customer_name: data.title,
        customer_email: 'internal@calendar.app',
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed' as const,
        notes: notesContent,
        internal_notes: `Interne afspraak - handmatig aangemaakt - ${duration} minuten`,
      };

      console.log('Creating booking with data:', bookingData);

      // Use optimistic booking creation
      createBooking(bookingData);

      // Close modal and reset form immediately (optimistic UX)
      form.reset();
      onClose();
      onBookingCreated?.();

    } catch (error) {
      console.error('=== BOOKING CREATION ERROR ===');
      console.error('Error details:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout opgetreden';
      
      toast({
        title: "Fout bij aanmaken afspraak",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return {
    form,
    serviceTypes,
    autoUpdateEndTime,
    setAutoUpdateEndTime,
    hasReminder,
    startTime,
    endTime,
    isCreating,
    handleTimeChange,
    handleServiceTypeChange,
    getDuration,
    onSubmit,
  };
}
