import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail, Phone, MapPin, Send, Loader2, Linkedin, Instagram, Twitter, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address').max(254, 'Email must be less than 254 characters'),
  phone: z.string().max(20, 'Phone must be less than 20 characters').optional().or(z.literal('')),
  company: z.string().max(100, 'Company must be less than 100 characters').optional().or(z.literal('')),
  subject: z.string().min(1, 'Please select a subject'),
  budget: z.string().optional(),
  platform: z.string().optional(),
  message: z.string().min(1, 'Message is required').max(2000, 'Message must be less than 2000 characters'),
  requestMeeting: z.boolean().default(false),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const subjectOptions = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'sales', label: 'Sales Question' },
  { value: 'partnership', label: 'Partnership Opportunity' },
  { value: 'support', label: 'Technical Support' },
  { value: 'meeting', label: 'Schedule a Meeting' },
];

const budgetOptions = [
  { value: 'exploring', label: 'Just exploring' },
  { value: 'under-50', label: 'Under €50/month' },
  { value: '50-200', label: '€50 - €200/month' },
  { value: '200-500', label: '€200 - €500/month' },
  { value: '500-plus', label: '€500+/month' },
  { value: 'enterprise', label: 'Custom / Enterprise' },
];

const platformOptions = [
  { value: 'google-meet', label: 'Google Meet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'discord', label: 'Discord' },
  { value: 'slack', label: 'Slack' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'other', label: 'Other' },
];

const socialLinks = [
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Facebook, href: '#', label: 'Facebook' },
];

const Contact: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      subject: '',
      budget: '',
      platform: '',
      message: '',
      requestMeeting: false,
    },
  });

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('submit-contact-form', {
        body: {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          company: data.company || null,
          subject: data.subject,
          budget: data.budget || null,
          platform: data.platform || null,
          message: data.message,
          requestMeeting: data.requestMeeting,
          formType: 'contact_page',
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to submit form');
      }

      toast({
        title: 'Message sent!',
        description: data.requestMeeting
          ? "We'll get back to you shortly to schedule your meeting."
          : "We'll get back to you as soon as possible.",
      });

      form.reset();
    } catch (error: any) {
      console.error('Contact form error:', error);
      toast({
        title: 'Failed to send message',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(217, 35%, 12%)' }}>
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-8 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </Button>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have questions about BookingsAssistant? Want to schedule a demo? 
              We'd love to hear from you. Reach out anytime!
            </p>
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left column - Contact info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-6">
                  Contact Information
                </h2>
                <div className="space-y-6">
                  <a
                    href="mailto:support@bookingsassistant.com"
                    className="flex items-start gap-4 text-muted-foreground hover:text-primary transition-colors group"
                  >
                    <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Email</p>
                      <p className="group-hover:underline">support@bookingsassistant.com</p>
                    </div>
                  </a>

                  <a
                    href="tel:+31207942048"
                    className="flex items-start gap-4 text-muted-foreground hover:text-primary transition-colors group"
                  >
                    <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Phone</p>
                      <p className="group-hover:underline">+31 20 794 2048</p>
                    </div>
                  </a>

                  <div className="flex items-start gap-4 text-muted-foreground">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Address</p>
                      <p>Rokin</p>
                      <p>Amsterdam, Netherlands</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social links */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Follow Us
                </h3>
                <div className="flex gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-lg bg-card/50 border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                      aria-label={social.label}
                    >
                      <social.icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Office hours */}
              <div className="p-6 rounded-xl bg-card/30 border border-border/50">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Office Hours
                </h3>
                <div className="space-y-2 text-muted-foreground">
                  <p>Monday - Friday: 9:00 AM - 6:00 PM (CET)</p>
                  <p>Saturday - Sunday: Closed</p>
                </div>
                <p className="mt-4 text-sm text-muted-foreground/70">
                  Our AI booking assistant is available 24/7 for your customers!
                </p>
              </div>
            </div>

            {/* Right column - Contact form */}
            <div className="bg-card/30 border border-border/50 rounded-2xl p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-6">
                Send Us a Message
              </h2>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
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
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+31 6 12345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input placeholder="Your company" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="What's this about?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subjectOptions.map((option) => (
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget Indication</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select budget range" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {budgetOptions.map((option) => (
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
                      name="platform"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Meeting Platform</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select platform" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {platformOptions.map((option) => (
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

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us how we can help you..."
                            className="min-h-[120px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requestMeeting"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border/50 p-4 bg-card/20">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer">
                            I'd like to schedule a meeting
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            We'll reach out to set up a call to discuss your needs
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
