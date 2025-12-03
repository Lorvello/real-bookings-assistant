import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addDays, isWeekend, isBefore, startOfDay } from 'date-fns';
import { Mail, Send, CalendarIcon, Clock, CheckCircle } from 'lucide-react';
import Header from '@/components/Header';
import PublicPageWrapper from '@/components/PublicPageWrapper';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  company: z.string().optional(),
  country: z.string().min(1, 'Please select your country'),
  subject: z.string().min(1, 'Please select a subject'),
  budget: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  requestMeeting: z.boolean().default(false),
  meetingDate: z.date().optional(),
  meetingTime: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const subjectOptions = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'sales', label: 'Sales Question' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'support', label: 'Support' },
  { value: 'demo', label: 'Request a Demo' },
];

const budgetOptions = [
  { value: 'exploring', label: 'Just exploring' },
  { value: 'starter', label: 'Starter Plan (€20/month)' },
  { value: 'professional', label: 'Professional Plan (€48/month)' },
  { value: 'enterprise', label: 'Enterprise (Custom pricing)' },
];

const countryOptions = [
  { value: 'nl', label: 'Netherlands' },
  { value: 'be', label: 'Belgium' },
  { value: 'de', label: 'Germany' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'us', label: 'United States' },
  { value: 'fr', label: 'France' },
  { value: 'es', label: 'Spain' },
  { value: 'it', label: 'Italy' },
  { value: 'other', label: 'Other' },
];

const timeSlots = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<{ date: string; time: string }[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      country: '',
      subject: '',
      budget: '',
      message: '',
      requestMeeting: false,
      meetingDate: undefined,
      meetingTime: '',
    },
  });

  const watchRequestMeeting = form.watch('requestMeeting');
  const watchMeetingDate = form.watch('meetingDate');

  useEffect(() => {
    const fetchBookedSlots = async () => {
      const startDate = new Date();
      const endDate = addDays(startDate, 30);
      
      const { data, error } = await supabase.rpc('get_booked_meeting_slots', {
        p_start_date: format(startDate, 'yyyy-MM-dd'),
        p_end_date: format(endDate, 'yyyy-MM-dd'),
      });

      if (!error && data) {
        setBookedSlots(data.map((slot: { meeting_date: string; meeting_time: string }) => ({
          date: slot.meeting_date,
          time: slot.meeting_time.substring(0, 5),
        })));
      }
    };

    fetchBookedSlots();
  }, []);

  const getAvailableTimeSlotsForDate = (date: Date | undefined) => {
    if (!date) return timeSlots;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const bookedTimesForDate = bookedSlots
      .filter(slot => slot.date === dateStr)
      .map(slot => slot.time);
    
    return timeSlots.filter(time => !bookedTimesForDate.includes(time));
  };

  const dateHasAvailableSlots = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const bookedTimesForDate = bookedSlots
      .filter(slot => slot.date === dateStr)
      .map(slot => slot.time);
    
    return timeSlots.some(time => !bookedTimesForDate.includes(time));
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    return (
      isBefore(date, today) ||
      isWeekend(date) ||
      !dateHasAvailableSlots(date)
    );
  };

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);

    try {
      if (data.requestMeeting) {
        if (!data.meetingDate || !data.meetingTime) {
          toast({
            title: "Meeting details required",
            description: "Please select both a date and time for your meeting.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        const { data: isAvailable } = await supabase.rpc('check_meeting_slot_available', {
          p_date: format(data.meetingDate, 'yyyy-MM-dd'),
          p_time: data.meetingTime,
        });

        if (!isAvailable) {
          toast({
            title: "Time slot no longer available",
            description: "This time slot was just booked. Please select another time.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        const { error: meetingError } = await supabase
          .from('contact_meetings')
          .insert({
            name: data.name,
            email: data.email,
            company: data.company || null,
            subject: data.subject,
            budget: data.budget || null,
            message: data.message,
            meeting_date: format(data.meetingDate, 'yyyy-MM-dd'),
            meeting_time: data.meetingTime,
          });

        if (meetingError) throw meetingError;
      }

      const { error } = await supabase.functions.invoke('submit-contact-form', {
        body: {
          name: data.name,
          email: data.email,
          company: data.company,
          country: data.country,
          subject: data.subject,
          budget: data.budget,
          message: data.message,
          requestMeeting: data.requestMeeting,
          meetingDate: data.meetingDate ? format(data.meetingDate, 'yyyy-MM-dd') : null,
          meetingTime: data.meetingTime,
        },
      });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: data.requestMeeting ? "Meeting scheduled!" : "Message sent!",
        description: data.requestMeeting 
          ? `Your meeting is scheduled for ${format(data.meetingDate!, 'PPP')} at ${data.meetingTime} CET.`
          : "We'll get back to you as soon as possible.",
      });

      form.reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableTimeSlotsForSelectedDate = getAvailableTimeSlotsForDate(watchMeetingDate);

  return (
    <PublicPageWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
        <Header />
        
        {/* Hero Section */}
        <section className="pt-32 md:pt-40 pb-12 md:pb-16 px-4 relative overflow-hidden">
          {/* Animated background blobs */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-gradient-to-r from-emerald-600/20 via-slate-600/10 to-emerald-500/15 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-gradient-to-l from-emerald-500/15 via-slate-600/10 to-emerald-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-emerald-700/10 via-slate-700/5 to-emerald-600/10 rounded-full blur-3xl" />
          </div>
          
          {/* Grid pattern */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16_185_129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16_185_129,0.05)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-40" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            {/* Badge */}
            <ScrollAnimatedSection animation="fade-up" delay={0} as="div">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 backdrop-blur-sm mb-6">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
                <span className="text-emerald-300 text-sm font-medium tracking-wide">Get in Touch</span>
              </div>
            </ScrollAnimatedSection>

            {/* Heading */}
            <ScrollAnimatedSection animation="fade-up" delay={100} as="h1" className="text-4xl md:text-5xl xl:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-200 bg-clip-text text-transparent">
                Let's Start a{' '}
              </span>
              <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent">
                Conversation
              </span>
            </ScrollAnimatedSection>

            <ScrollAnimatedSection animation="fade-up" delay={200} as="p" className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto">
              Have questions or ready to transform your booking experience? We'd love to hear from you.
            </ScrollAnimatedSection>
          </div>
        </section>

        {/* Form Section */}
        <section className="pb-24 px-4 relative z-10">
          <ScrollAnimatedSection animation="fade-up" delay={300} as="div" className="max-w-2xl mx-auto">
            {isSuccess ? (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-8 md:p-10 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-4">Thank you!</h2>
                <p className="text-slate-300 mb-6">
                  We've received your message and will get back to you shortly.
                </p>
                <Button
                  onClick={() => setIsSuccess(false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 md:p-10">
                <h2 className="text-2xl font-semibold text-white mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Mail className="h-5 w-5 text-emerald-400" />
                  </div>
                  Send Us a Message
                </h2>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Name & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Your name"
                                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Email *</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="your@email.com"
                                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Company & Country */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Company</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Your company"
                                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Country *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white focus:border-emerald-500">
                                  <SelectValue placeholder="Select your country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                {countryOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    className="text-white hover:bg-slate-700 focus:bg-slate-700"
                                  >
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

                    {/* Subject & Budget */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Subject *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white focus:border-emerald-500">
                                  <SelectValue placeholder="Select a topic" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                {subjectOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    className="text-white hover:bg-slate-700 focus:bg-slate-700"
                                  >
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
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Budget indication</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white focus:border-emerald-500">
                                  <SelectValue placeholder="Select budget" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                {budgetOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    className="text-white hover:bg-slate-700 focus:bg-slate-700"
                                  >
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

                    {/* Message */}
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300">Message *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us about your needs..."
                              rows={4}
                              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Schedule Meeting Checkbox */}
                    <FormField
                      control={form.control}
                      name="requestMeeting"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-slate-700/50 p-4 bg-slate-900/30">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-white font-medium cursor-pointer">
                              I'd like to schedule a meeting
                            </FormLabel>
                            <p className="text-sm text-slate-400">
                              Select a date and time below to book directly
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Inline Meeting Calendar & Time Picker */}
                    {watchRequestMeeting && (
                      <div className="space-y-4 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center gap-2 mb-4">
                          <CalendarIcon className="h-5 w-5 text-emerald-400" />
                          <span className="text-white font-medium">Select meeting date & time</span>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Inline Calendar */}
                          <FormField
                            control={form.control}
                            name="meetingDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel className="text-slate-300 mb-2">Date *</FormLabel>
                                <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-2">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={(date) => {
                                      field.onChange(date);
                                      form.setValue('meetingTime', '');
                                    }}
                                    disabled={isDateDisabled}
                                    className="p-0 pointer-events-auto [&_.rdp-day]:text-white [&_.rdp-day_button]:text-white"
                                    fromDate={new Date()}
                                    toDate={addDays(new Date(), 30)}
                                  />
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Time Slots */}
                          <FormField
                            control={form.control}
                            name="meetingTime"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel className="text-slate-300 mb-2">
                                  <Clock className="inline h-4 w-4 mr-1 text-emerald-400" />
                                  Available Times (CET) *
                                </FormLabel>
                                <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4 flex-1">
                                  {watchMeetingDate ? (
                                    <div className="space-y-2">
                                      <p className="text-sm text-slate-400 mb-3">
                                        {format(watchMeetingDate, 'EEEE, MMMM d, yyyy')}
                                      </p>
                                      {availableTimeSlotsForSelectedDate.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                          {availableTimeSlotsForSelectedDate.map((time) => (
                                            <button
                                              key={time}
                                              type="button"
                                              onClick={() => field.onChange(time)}
                                              className={cn(
                                                "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                                field.value === time
                                                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                                                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600"
                                              )}
                                            >
                                              {time}
                                            </button>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-slate-500 text-sm">No available slots for this date</p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center h-full min-h-[120px]">
                                      <p className="text-slate-500 text-sm text-center">
                                        Select a date to see available times
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {watchMeetingDate && form.watch('meetingTime') && (
                          <div className="flex items-center gap-2 p-3 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                            <span className="text-emerald-300 text-sm">
                              Meeting: {format(watchMeetingDate, 'PPP')} at {form.watch('meetingTime')} CET
                            </span>
                          </div>
                        )}

                        <p className="text-sm text-emerald-300/80">
                          ✓ Available slots are shown in real-time. Once booked, the slot is reserved.
                        </p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-6 text-lg shadow-lg shadow-emerald-500/25 transition-all duration-300"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Send className="h-5 w-5" />
                          {watchRequestMeeting ? 'Schedule Meeting' : 'Send Message'}
                        </div>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            )}
          </ScrollAnimatedSection>
        </section>
      </div>
    </PublicPageWrapper>
  );
};

export default Contact;
