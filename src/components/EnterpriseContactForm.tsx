import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Phone, Mail, Globe, Users, MessageSquare, X } from 'lucide-react';

const enterpriseFeatures = [
  'Complete professional suite included',
  'Unlimited enterprise WhatsApp contact management',
  'Unlimited enterprise user access management',
  'Dedicated WhatsApp Business API with custom branding',
  'Intelligent voice call routing & distribution',
  'Omnichannel social media DM orchestration',
  'Advanced reputation management & review analytics',
  'Enterprise SLA with dedicated success management',
  'White-glove onboarding & strategic integration consulting',
];

const companySizeOptions = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '200+', label: '200+ employees' },
];

const formSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  companyWebsite: z.string().url('Please enter a valid website URL'),
  phoneNumber: z.string().optional(),
  companySize: z.string().min(1, 'Please select your company size'),
  selectedFeatures: z.array(z.string()).min(1, 'Please select at least one feature of interest'),
  message: z.string().optional(),
  requestMeeting: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface EnterpriseContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EnterpriseContactForm: React.FC<EnterpriseContactFormProps> = ({
  open,
  onOpenChange,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      companyName: '',
      companyWebsite: '',
      phoneNumber: '',
      companySize: '',
      selectedFeatures: [],
      message: '',
      requestMeeting: true,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-enterprise-contact', {
        body: {
          ...data,
          selectedFeatures: data.selectedFeatures,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Enterprise Inquiry Submitted',
        description: 'Thank you for your interest! Our enterprise team will contact you within 24 hours.',
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting enterprise contact form:', error);
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your inquiry. Please try again or contact us directly.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeatureToggle = (feature: string, checked: boolean) => {
    const currentFeatures = form.getValues('selectedFeatures');
    if (checked) {
      form.setValue('selectedFeatures', [...currentFeatures, feature]);
    } else {
      form.setValue('selectedFeatures', currentFeatures.filter(f => f !== feature));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white text-center">
            Get Started with Enterprise
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Contact Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-white">Contact Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Full Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="John Doe"
                          className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
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
                      <FormLabel className="text-gray-300 flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        Email Address *
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="john@company.com"
                          className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Company Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="ACME Corporation"
                          className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyWebsite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                        Company Website *
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://www.company.com"
                          className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="+31 6 12345678"
                          className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Current Business Size *
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                            <SelectValue placeholder="Select company size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {companySizeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white hover:bg-gray-700">
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
            </div>

            {/* Feature Interest Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-white">Enterprise Features Interest</h3>
              </div>
              
              <FormField
                control={form.control}
                name="selectedFeatures"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Select the features you're most interested in *</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {enterpriseFeatures.map((feature) => (
                        <FormField
                          key={feature}
                          control={form.control}
                          name="selectedFeatures"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={feature}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(feature)}
                                    onCheckedChange={(checked) => handleFeatureToggle(feature, checked as boolean)}
                                    className="mt-1"
                                  />
                                </FormControl>
                                <FormLabel className="text-sm text-gray-300 font-normal leading-relaxed cursor-pointer">
                                  {feature}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Additional Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-white">Additional Information</h3>
              </div>
              
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Message / Requirements</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Tell us about your specific requirements, goals, or any questions you have about our Enterprise solution..."
                        className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 min-h-[100px] resize-none"
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
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-700 p-4 bg-gray-800/50">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-gray-300 font-normal">
                        Request a personalized consultation meeting
                      </FormLabel>
                      <p className="text-sm text-gray-400">
                        Our enterprise team will schedule a call to discuss your specific needs and demonstrate our platform.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6 border-t border-gray-700">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {isSubmitting ? 'Submitting...' : 'Request Enterprise Consultation'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};