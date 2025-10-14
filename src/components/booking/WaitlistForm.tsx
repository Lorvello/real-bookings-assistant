import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { checkWaitlistRateLimit } from '@/utils/rateLimiter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const waitlistSchema = z.object({
  customerName: z.string().min(1, 'Naam is verplicht'),
  customerEmail: z.string().email('Ongeldig email adres'),
  preferredDate: z.date(),
  flexibility: z.enum(['anytime', 'morning', 'afternoon', 'evening']).default('anytime')
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

interface WaitlistFormProps {
  calendarSlug: string;
  serviceTypeId: string;
  onSuccess?: () => void;
}

export const WaitlistForm = ({ calendarSlug, serviceTypeId, onSuccess }: WaitlistFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      flexibility: 'anytime'
    }
  });

  const handleSubmit = async (data: WaitlistFormData) => {
    // Client-side rate limit check
    const rateLimit = checkWaitlistRateLimit('client');
    if (!rateLimit.allowed) {
      toast({
        title: "Te veel aanvragen",
        description: "Je hebt te vaak geprobeerd je aan te melden voor de wachtlijst.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: result, error } = await supabase.functions.invoke('add-to-waitlist', {
        body: {
          calendarSlug,
          serviceTypeId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          preferredDate: format(data.preferredDate, 'yyyy-MM-dd'),
          flexibility: data.flexibility
        }
      });

      if (error) {
        if (error.status === 429) {
          toast({
            title: "Limiet bereikt",
            description: "Wacht even voordat je het opnieuw probeert.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Toegevoegd aan wachtlijst",
        description: "We nemen contact met je op zodra er een plek beschikbaar is."
      });

      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || "Er is iets misgegaan",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Naam</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferredDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gewenste datum</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'PPP', { locale: nl }) : 'Selecteer datum'}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Bezig...' : 'Toevoegen aan wachtlijst'}
        </Button>
      </form>
    </Form>
  );
};
