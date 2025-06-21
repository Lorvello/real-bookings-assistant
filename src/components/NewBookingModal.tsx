
import React, { useState } from 'react';
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
}).refine((data) => {
  if (!data.isAllDay && (!data.startTime || !data.endTime)) {
    return false;
  }
  return true;
}, {
  message: "Start tijd en eind tijd zijn verplicht als het geen hele dag event is",
  path: ["startTime"],
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface NewBookingModalProps {
  open: boolean;
  onClose: () => void;
  calendarId: string;
  onBookingCreated?: () => void;
}

export function NewBookingModal({ open, onClose, calendarId, onBookingCreated }: NewBookingModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    },
  });

  const isAllDay = form.watch('isAllDay');
  const hasReminder = form.watch('hasReminder');

  const onSubmit = async (data: BookingFormData) => {
    try {
      setIsSubmitting(true);

      // Bereken start en eind tijden
      let startTime: string;
      let endTime: string;

      if (data.isAllDay) {
        const dateStr = format(data.date, 'yyyy-MM-dd');
        startTime = `${dateStr}T00:00:00+01:00`;
        endTime = `${dateStr}T23:59:59+01:00`;
      } else {
        const dateStr = format(data.date, 'yyyy-MM-dd');
        startTime = `${dateStr}T${data.startTime}:00+01:00`;
        endTime = `${dateStr}T${data.endTime}:00+01:00`;
      }

      // Maak de booking aan
      const { error } = await supabase
        .from('bookings')
        .insert({
          calendar_id: calendarId,
          customer_name: data.title, // Gebruik titel als customer naam voor interne events
          customer_email: 'internal@calendar.app', // Placeholder email voor interne events
          start_time: startTime,
          end_time: endTime,
          status: 'confirmed',
          notes: [
            data.location && `Locatie: ${data.location}`,
            data.description && `Beschrijving: ${data.description}`,
            data.hasReminder && `Herinnering: ${data.reminderTiming} minuten van tevoren`,
          ].filter(Boolean).join('\n'),
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Afspraak aangemaakt",
        description: "De nieuwe afspraak is succesvol toegevoegd aan uw kalender.",
      });

      form.reset();
      onClose();
      onBookingCreated?.();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Fout bij aanmaken afspraak",
        description: "Er is een fout opgetreden bij het aanmaken van de afspraak.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start tijd</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Bezig...' : 'Opslaan'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
