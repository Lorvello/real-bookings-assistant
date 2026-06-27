
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

interface BookingPrefill {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

interface UseBookingFormProps {
  calendarId: string;
  onBookingCreated?: () => void;
  onClose: () => void;
  prefill?: BookingPrefill;
}

export function useBookingForm({ calendarId, onBookingCreated, onClose, prefill }: UseBookingFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation('notifications');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [autoUpdateEndTime, setAutoUpdateEndTime] = useState(true);
  const { createBooking, isCreating } = useOptimisticBookings(calendarId);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      title: '',
      customerName: prefill?.customerName || '',
      customerEmail: prefill?.customerEmail || '',
      customerPhone: prefill?.customerPhone || '',
      location: '',
      date: new Date(),
      startTime: '13:00',
      endTime: '14:00',
      description: '',
      hasReminder: false,
      reminderTiming: '30',
      serviceTypeId: '',
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
          title: t('bookingForm.invalidTimesTitle', 'Invalid times'),
          description: t('bookingForm.invalidTimesDescription', 'End time must be after the start time'),
          variant: "destructive",
        });
        return;
      }

      if (duration > 480) { // 8 hours max
        toast({
          title: t('bookingForm.tooLongTitle', 'Appointment too long'),
          description: t('bookingForm.tooLongDescription', 'Appointments can be at most 8 hours'),
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
        customer_name: data.customerName,
        customer_email: data.customerEmail || null,
        customer_phone: data.customerPhone || null,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed' as const,
        notes: notesContent,
        internal_notes: `Created manually - ${duration} minutes`,
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
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

      toast({
        title: t('bookingForm.createFailedTitle', 'Failed to create appointment'),
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
