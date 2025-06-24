
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { Loader2, MessageCircle } from 'lucide-react';

const settingsSchema = z.object({
  booking_window_days: z.number().min(1).max(365),
  minimum_notice_hours: z.number().min(0).max(168),
  slot_duration: z.number().min(5).max(480),
  buffer_time: z.number().min(0).max(60),
  max_bookings_per_day: z.number().optional(),
  allow_waitlist: z.boolean(),
  confirmation_required: z.boolean(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface CalendarSettingsProps {
  calendarId: string;
}

export function CalendarSettings({ calendarId }: CalendarSettingsProps) {
  const { settings, loading, updateSettings } = useCalendarSettings(calendarId);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      booking_window_days: 60,
      minimum_notice_hours: 24,
      slot_duration: 30,
      buffer_time: 0,
      max_bookings_per_day: undefined,
      allow_waitlist: false,
      confirmation_required: false,
    },
  });

  // Update form when settings are loaded
  React.useEffect(() => {
    if (settings) {
      form.reset({
        booking_window_days: settings.booking_window_days,
        minimum_notice_hours: settings.minimum_notice_hours,
        slot_duration: settings.slot_duration,
        buffer_time: settings.buffer_time,
        max_bookings_per_day: settings.max_bookings_per_day || undefined,
        allow_waitlist: settings.allow_waitlist,
        confirmation_required: settings.confirmation_required,
      });
    }
  }, [settings, form]);

  const onSubmit = async (data: SettingsFormData) => {
    await updateSettings(data);
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Calendar Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Booking Window */}
            <FormField
              control={form.control}
              name="booking_window_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">
                    How far in advance can customers book?
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-input border-border text-foreground focus:ring-primary">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="7">1 week</SelectItem>
                      <SelectItem value="14">2 weeks</SelectItem>
                      <SelectItem value="30">1 month</SelectItem>
                      <SelectItem value="60">2 months</SelectItem>
                      <SelectItem value="90">3 months</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Minimum Notice */}
            <FormField
              control={form.control}
              name="minimum_notice_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">
                    Minimum advance notice for booking
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-input border-border text-foreground focus:ring-primary">
                        <SelectValue placeholder="Select minimum time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="0">Available immediately</SelectItem>
                      <SelectItem value="1">1 hour in advance</SelectItem>
                      <SelectItem value="24">24 hours in advance</SelectItem>
                      <SelectItem value="48">48 hours in advance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Slot Duration */}
            <FormField
              control={form.control}
              name="slot_duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">
                    Default time slot duration (minutes)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      className="bg-input border-border text-foreground focus-visible:ring-primary"
                    />
                  </FormControl>
                  <FormDescription>
                    The default duration for time slots in your calendar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Buffer Time */}
            <FormField
              control={form.control}
              name="buffer_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">
                    Buffer time between appointments (minutes)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      className="bg-input border-border text-foreground focus-visible:ring-primary"
                    />
                  </FormControl>
                  <FormDescription>
                    Extra time between appointments for preparation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Max Bookings Per Day */}
            <FormField
              control={form.control}
              name="max_bookings_per_day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">
                    Maximum bookings per day (optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="bg-input border-border text-foreground focus-visible:ring-primary"
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty for unlimited bookings
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* WhatsApp Auto-Reply Toggle */}
            <div className="p-4 bg-background-secondary rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-whatsapp/20 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-whatsapp" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium">WhatsApp Auto-Reply</h3>
                    <p className="text-sm text-muted-foreground">Automatically respond via WhatsApp</p>
                  </div>
                </div>
                <Switch
                  checked={true} // Mock data - replace with actual WhatsApp setting
                  className="data-[state=checked]:bg-whatsapp"
                />
              </div>
            </div>

            {/* Waitlist Toggle */}
            <FormField
              control={form.control}
              name="allow_waitlist"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base text-foreground">
                      Allow waitlist
                    </FormLabel>
                    <FormDescription>
                      Customers can join a waitlist when no slots are available
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Confirmation Required Toggle */}
            <FormField
              control={form.control}
              name="confirmation_required"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base text-foreground">
                      Confirmation required
                    </FormLabel>
                    <FormDescription>
                      Bookings must be confirmed by you before they are final
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Save Button */}
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
