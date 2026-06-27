import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { checkContactFormRateLimit } from '@/utils/rateLimiter';
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
import { Building2, Phone, Mail, Globe, Users, MessageSquare, X } from 'lucide-react';

// Canonical English feature/size values: these are submitted to the backend, so
// they must stay stable regardless of UI language. The visible label is what the
// i18n layer translates (value -> form data; label -> what the user reads).
const ENTERPRISE_FEATURE_DEFS: Array<[key: string, value: string]> = [
  ['enterpriseForm.features.f1', 'Complete professional suite included'],
  ['enterpriseForm.features.f2', 'Unlimited enterprise user access management'],
  ['enterpriseForm.features.f3', 'Dedicated WhatsApp Business API with custom branding'],
  ['enterpriseForm.features.f4', 'Intelligent voice call routing & distribution'],
  ['enterpriseForm.features.f5', 'Omnichannel social media DM orchestration'],
  ['enterpriseForm.features.f6', 'Advanced reputation management & review analytics'],
  ['enterpriseForm.features.f7', 'Enterprise SLA with dedicated success management'],
  ['enterpriseForm.features.f8', 'White-glove onboarding & strategic integration consulting'],
];

const COMPANY_SIZE_DEFS: Array<[value: string, key: string, label: string]> = [
  ['1-10', 'enterpriseForm.sizes.s1', '1-10 employees'],
  ['11-50', 'enterpriseForm.sizes.s2', '11-50 employees'],
  ['51-200', 'enterpriseForm.sizes.s3', '51-200 employees'],
  ['200+', 'enterpriseForm.sizes.s4', '200+ employees'],
];

const formSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  companyWebsite: z.string()
    .min(1, 'Please enter your company website')
    .transform((url) => {
      // Add https:// if no protocol is provided
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
      }
      return url;
    })
    .pipe(z.string().url('Please enter a valid website URL')),
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
  const { t } = useTranslation('common');

  const enterpriseFeatures = ENTERPRISE_FEATURE_DEFS.map(([key, value]) => ({
    value,
    label: t(key, value),
  }));
  const companySizeOptions = COMPANY_SIZE_DEFS.map(([value, key, label]) => ({
    value,
    label: t(key, label),
  }));

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
    // Client-side rate limit check
    const rateLimit = checkContactFormRateLimit('client');
    if (!rateLimit.allowed) {
      toast({
        title: t('enterpriseForm.toast.rateLimitClientTitle', 'Too many requests'),
        description: t('enterpriseForm.toast.rateLimitClientDesc', 'Please wait before submitting another form.'),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('submit-contact-form', {
        body: {
          name: data.fullName,
          email: data.email,
          company: data.companyName,
          message: data.message,
          formType: 'enterprise'
        },
      });

      if (error) {
        // Handle 429 rate limit from server
        if (error.status === 429) {
          toast({
            title: t('enterpriseForm.toast.rateLimitServerTitle', 'Limit reached'),
            description: t('enterpriseForm.toast.rateLimitServerDesc', "You've submitted too many forms. Please try again later."),
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      toast({
        title: t('enterpriseForm.toast.successTitle', 'Enterprise Inquiry Submitted'),
        description: t('enterpriseForm.toast.successDesc', 'Thank you for your interest! Our enterprise team will contact you within 24 hours.'),
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting enterprise contact form:', error);
      toast({
        title: t('enterpriseForm.toast.failTitle', 'Submission Failed'),
        description: t('enterpriseForm.toast.failDesc', 'There was an error submitting your inquiry. Please try again or contact us directly.'),
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
            {t('enterpriseForm.title', 'Get Started with Enterprise')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Contact Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-white">{t('enterpriseForm.sectionContact', 'Contact Information')}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">{t('enterpriseForm.fullName', 'Full Name *')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('enterpriseForm.fullNamePlaceholder', 'John Doe')}
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
                        {t('enterpriseForm.email', 'Email Address *')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder={t('enterpriseForm.emailPlaceholder', 'john@company.com')}
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
                      <FormLabel className="text-gray-300">{t('enterpriseForm.companyName', 'Company Name *')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('enterpriseForm.companyNamePlaceholder', 'ACME Corporation')}
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
                        {t('enterpriseForm.companyWebsite', 'Company Website *')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('enterpriseForm.companyWebsitePlaceholder', 'https://www.company.com')}
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
                        {t('enterpriseForm.phoneNumber', 'Phone Number')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('enterpriseForm.phoneNumberPlaceholder', '+31 6 12345678')}
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
                        {t('enterpriseForm.companySize', 'Current Business Size *')}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                            <SelectValue placeholder={t('enterpriseForm.companySizePlaceholder', 'Select company size')} />
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
                <h3 className="text-lg font-semibold text-white">{t('enterpriseForm.sectionFeatures', 'Enterprise Features Interest')}</h3>
              </div>
              
              <FormField
                control={form.control}
                name="selectedFeatures"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-gray-300">{t('enterpriseForm.featuresLabel', "Select the features you're most interested in *")}</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {enterpriseFeatures.map((feature) => (
                        <FormField
                          key={feature.value}
                          control={form.control}
                          name="selectedFeatures"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={feature.value}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(feature.value)}
                                    onCheckedChange={(checked) => handleFeatureToggle(feature.value, checked as boolean)}
                                    className="mt-1"
                                  />
                                </FormControl>
                                <FormLabel className="text-sm text-gray-300 font-normal leading-relaxed cursor-pointer">
                                  {feature.label}
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
                <h3 className="text-lg font-semibold text-white">{t('enterpriseForm.sectionAdditional', 'Additional Information')}</h3>
              </div>
              
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">{t('enterpriseForm.messageLabel', 'Message / Requirements')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('enterpriseForm.messagePlaceholder', 'Tell us about your specific requirements, goals, or any questions you have about our Enterprise solution...')}
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
                        {t('enterpriseForm.requestMeeting', 'Request a personalized consultation meeting')}
                      </FormLabel>
                      <p className="text-sm text-gray-400">
                        {t('enterpriseForm.requestMeetingDesc', 'Our enterprise team will schedule a call to discuss your specific needs and demonstrate our platform.')}
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
                {isSubmitting ? t('enterpriseForm.submitting', 'Submitting...') : t('enterpriseForm.submit', 'Request Enterprise Consultation')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};