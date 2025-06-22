
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticBookings } from '@/hooks/useOptimisticBookings';

const bookingSchema = z.object({
  title: z.string().min(1, 'Titel is verplicht'),
  location: z.string().optional(),
  date: z.date({
    required_error: 'Datum is verplicht',
  }),
  isAllDay: z.boolean().default(false),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  description: z.string().optional(),
  hasReminder: z.boolean().default(false),
  reminderTiming: z.string().optional(),
  serviceTypeId: z.string().optional(),
  isInternal: z.boolean().default(true),
}).refine((data) => {
  if (!data.isAllDay && (!data.startTime || !data.endTime)) {
    return false;
  }
  // Valideer dat eind tijd na start tijd is
  if (!data.isAllDay && data.startTime && data.endTime) {
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return endMinutes > startMinutes;
  }
  return true;
}, {
  message: "Eindtijd moet na starttijd zijn",
  path: ["endTime"],
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface ServiceType {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface NewBookingModalProps {
  open: boolean;
  onClose: () => void;
  calendarId: string;
  onBookingCreated?: () => void;
}

export function NewBookingModal({ open, onClose, calendarId, onBookingCreated }: NewBookingModalProps) {
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
      isAllDay: false,
      startTime: '13:00',
      endTime: '14:00',
      description: '',
      hasReminder: false,
      reminderTiming: '30',
      serviceTypeId: '',
      isInternal: true,
    },
  });

  const isAllDay = form.watch('isAllDay');
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
            const [hours, minutes] = startTime.split(':').map(Number);
            const startMinutes = hours * 60 + minutes;
            const endMinutes = startMinutes + data[0].duration;
            const endHours = Math.floor(endMinutes / 60);
            const endMins = endMinutes % 60;
            form.setValue('endTime', `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`);
          }
        }
      }
    };

    if (open) {
      loadServiceTypes();
    }
  }, [calendarId, open, selectedServiceType, form, autoUpdateEndTime]);

  // Update end time when service type or start time changes (only if auto-update is enabled)
  useEffect(() => {
    if (!autoUpdateEndTime) return;

    const subscription = form.watch((value, { name }) => {
      if ((name === 'serviceTypeId' || name === 'startTime') && value.serviceTypeId && value.startTime && !isAllDay) {
        const selectedService = serviceTypes.find(s => s.id === value.serviceTypeId);
        if (selectedService) {
          const [hours, minutes] = value.startTime.split(':').map(Number);
          const startMinutes = hours * 60 + minutes;
          const endMinutes = startMinutes + selectedService.duration;
          const endHours = Math.floor(endMinutes / 60);
          const endMins = endMinutes % 60;
          form.setValue('endTime', `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, serviceTypes, isAllDay, autoUpdateEndTime]);

  // Calculate duration for display
  const calculateDuration = () => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return Math.max(0, endMinutes - startMinutes);
  };

  const onSubmit = async (data: BookingFormData) => {
    try {
      console.log('=== BOOKING CREATION DEBUG ===');
      console.log('Form data:', data);
      console.log('Calendar ID:', calendarId);
      console.log('Duration calculated:', calculateDuration(), 'minutes');

      // Validate duration
      const duration = calculateDuration();
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
      let startTime: string;
      let endTime: string;

      if (data.isAllDay) {
        const dateStr = format(data.date, 'yyyy-MM-dd');
        startTime = `${dateStr}T00:00:00+01:00`;
        endTime = `${dateStr}T23:59:59+01:00`;
      } else {
        if (!data.startTime || !data.endTime) {
          throw new Error('Start time and end time are required for non-all-day events');
        }
        const dateStr = format(data.date, 'yyyy-MM-dd');
        startTime = `${dateStr}T${data.startTime}:00+01:00`;
        endTime = `${dateStr}T${data.endTime}:00+01:00`;
      }

      console.log('Calculated times:', { startTime, endTime });

      // Build notes content
      const notesContent = [
        data.location && `Locatie: ${data.location}`,
        data.description && `Beschrijving: ${data.description}`,
        data.hasReminder && `Herinnering: ${data.reminderTiming} minuten van tevoren`,
        'Interne afspraak - handmatig aangemaakt',
        `Duur: ${duration} minuten`
      ].filter(Boolean).join('\n');

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
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout opgetreden';
      
      toast({
        title: "Fout bij aanmaken afspraak",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? '00' : '30';
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes}`;
    return { value: timeString, label: timeString };
  });

  const reminderOptions = [
    { value: '15', label: '15 minuten' },
    { value: '30', label: '30 minuten' },
    { value: '60', label: '1 uur' },
    { value: '120', label: '2 uur' },
    { value: '1440', label: '1 dag' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nieuwe Afspraak</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Titel */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titel *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Voer een titel in" className="bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Type Selectie */}
            {serviceTypes.length > 0 && (
              <FormField
                control={form.control}
                name="serviceTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      // Disable auto-update when user manually selects a service type
                      setAutoUpdateEndTime(false);
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecteer service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceTypes.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} ({service.duration} min)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Locatie */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locatie</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Voer een locatie in" className="bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Datum */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Datum *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal bg-background",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Selecteer een datum</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hele dag toggle */}
            <FormField
              control={form.control}
              name="isAllDay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">Hele dag</FormLabel>
                </FormItem>
              )}
            />

            {/* Tijd selectie */}
            {!isAllDay && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start tijd</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          setAutoUpdateEndTime(false); // User manually changed time
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Selecteer tijd" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Eind tijd</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          setAutoUpdateEndTime(false); // User manually changed time
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Selecteer tijd" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Duration indicator */}
                {startTime && endTime && (
                  <div className="text-sm text-muted-foreground">
                    Duur: {calculateDuration()} minuten ({(calculateDuration() / 60).toFixed(1)} uur)
                  </div>
                )}

                {/* Auto-update toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="auto-update" 
                    checked={autoUpdateEndTime} 
                    onCheckedChange={(checked) => setAutoUpdateEndTime(checked === true)} 
                  />
                  <label htmlFor="auto-update" className="text-sm text-muted-foreground">
                    Automatisch eindtijd berekenen op basis van service type
                  </label>
                </div>
              </div>
            )}

            {/* Beschrijving */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschrijving</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Voer een beschrijving in" 
                      className="bg-background"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Herinnering sectie */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="hasReminder"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">Herinnering instellen</FormLabel>
                  </FormItem>
                )}
              />

              {hasReminder && (
                <FormField
                  control={form.control}
                  name="reminderTiming"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Herinnering timing</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecteer timing" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reminderOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Bezig...' : 'Opslaan'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
