import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UseFormReturn } from 'react-hook-form';
import { BookingFormData } from './bookingSchema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { validateEmail, validatePhoneNumber } from '@/utils/inputSanitization';
import { ValidationFeedback } from './ValidationFeedback';
import { cn } from '@/lib/utils';

interface ServiceType {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface BookingBasicFieldsProps {
  form: UseFormReturn<BookingFormData>;
  serviceTypes: ServiceType[];
  onServiceTypeChange: (value: string) => void;
}

export function BookingBasicFields({ form, serviceTypes, onServiceTypeChange }: BookingBasicFieldsProps) {
  const { t } = useTranslation('appPages');
  const [titleValidation, setTitleValidation] = useState<'valid' | 'warning' | 'error' | 'idle'>('idle');
  const [nameValidation, setNameValidation] = useState<'valid' | 'warning' | 'error' | 'idle'>('idle');
  const [emailValidation, setEmailValidation] = useState<'valid' | 'warning' | 'error' | 'idle'>('idle');
  const [phoneValidation, setPhoneValidation] = useState<'valid' | 'warning' | 'error' | 'idle'>('idle');
  const [locationValidation, setLocationValidation] = useState<'valid' | 'warning' | 'error' | 'idle'>('idle');

  const handleTitleChange = (value: string, onChange: (value: string) => void) => {
    // Basic sanitization without trim (allow spaces while typing)
    const sanitized = value.replace(/[<>]/g, '');
    
    if (sanitized.length > 200) {
      setTitleValidation('error');
    } else if (sanitized.length > 0) {
      setTitleValidation('valid');
    } else {
      setTitleValidation('idle');
    }
    
    onChange(sanitized);
  };

  const handleEmailBlur = (value: string) => {
    if (!value) {
      setEmailValidation('idle');
      return;
    }
    
    const result = validateEmail(value);
    if (!result.valid) {
      setEmailValidation('error');
    } else {
      setEmailValidation('valid');
    }
  };

  const handleNameChange = (value: string, onChange: (value: string) => void) => {
    // Basic sanitization without trim (allow spaces while typing)
    const sanitized = value.replace(/[<>]/g, '');
    
    if (sanitized.length > 200) {
      setNameValidation('error');
    } else if (sanitized.length > 0) {
      setNameValidation('valid');
    } else {
      setNameValidation('idle');
    }
    
    onChange(sanitized);
  };

  const handlePhoneChange = (value: string, onChange: (value: string) => void) => {
    if (!value) {
      setPhoneValidation('idle');
      onChange('');
      return;
    }

    // SEQP1R10 (P1-9-PHONE2 root-cause fix): this used to call validatePhoneNumber()
    // purely for its side-effect validation state, then discard the computed E.164
    // result.value and store the raw, still-ambiguous typed text via onChange(value).
    // That is the exact root cause R9 verify traced the whole phone-mis-normalization
    // bug class back to: a real E.164 value was computed right here and thrown away,
    // forcing every later consumer (the Meta send boundary) to re-guess a country from
    // a bare local-format string after the fact, which is inherently ambiguous (a UK
    // number and, worse, an FR/BE number are byte-identical in shape to an NL "06"
    // number). Storing the already-disambiguated E.164 value the moment it's known
    // removes the need to guess ever again for any NEW booking created through this
    // form. While the user is still typing (result invalid, e.g. an incomplete
    // number), keep echoing the raw text so they can keep editing; only swap to the
    // normalized E.164 value once libphonenumber-js confirms it's a real number.
    //
    // A code-review pass on this same round caught that simply passing this call's
    // own defaultCountry:'NL' straight through reproduces the exact bug this round
    // fixes, just one step earlier: validatePhoneNumber('0687654321', {defaultCountry:
    // 'NL'}) happily returns {valid:true, value:'+31687654321'} for a French mobile
    // number, since libphonenumber-js has the SAME defaultCountry ambiguity as the
    // retired normalizePhoneForMeta guess did. That wrongly-guessed value would then
    // sail through every later gate (the Zod E164_SHAPE refine, validatePhoneServerSide,
    // the DB CHECK constraint), because all of them correctly trust an explicit "+" as
    // "already resolved", with no way to know it was resolved WRONG. This form has no
    // country selector (unlike the public booking form's usePublicBookingCreation.tsx,
    // which uses the customer's own selected country as the defaultCountry hint), so
    // there is no safe signal here to disambiguate a bare local-format number typed by
    // the business owner on a customer's behalf. Mirror the server-side validator's
    // philosophy instead: only trust a number that ALREADY declares its own country via
    // an explicit "+"/"00" prefix; a bare local-format number (no such prefix) is
    // rejected as needing an explicit country code, never silently assumed to be NL.
    const hasExplicitCountryPrefix = /^\+/.test(value.trim()) || /^00\d/.test(value.trim().replace(/[^\d]/g, ''));
    if (!hasExplicitCountryPrefix) {
      setPhoneValidation('error');
      onChange(value);
      return;
    }

    const result = validatePhoneNumber(value, { defaultCountry: 'NL' });
    if (!result.valid) {
      setPhoneValidation('error');
      onChange(value);
    } else {
      setPhoneValidation('valid');
      onChange(result.value);
    }
  };

  const handleLocationChange = (value: string, onChange: (value: string) => void) => {
    if (!value) {
      setLocationValidation('idle');
      onChange('');
      return;
    }

    // Basic sanitization without trim (allow spaces while typing)
    const sanitized = value.replace(/[<>]/g, '');
    if (sanitized.length > 500) {
      setLocationValidation('error');
    } else {
      setLocationValidation('valid');
    }
    
    onChange(sanitized);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <FormField
        control={form.control}
        name="title"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>{t('convPage.titleLabel', 'Title *')}</FormLabel>
            <FormControl>
              <Input
                {...field}
                onChange={(e) => handleTitleChange(e.target.value, field.onChange)}
                onBlur={field.onBlur}
                placeholder={t('convPage.titlePlaceholder', 'For example: Haircut for John')}
                className={cn(
                  "bg-background transition-colors",
                  fieldState.error && "border-destructive",
                  titleValidation === 'valid' && !fieldState.error && "border-green-500 focus:ring-green-500"
                )}
              />
            </FormControl>
            <FormDescription>
              {t('convPage.titleDescription', 'A clear title helps you keep your appointments organized')}
            </FormDescription>
            {!fieldState.error && titleValidation !== 'idle' && (
              <ValidationFeedback status={titleValidation} />
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Customer Name */}
      <FormField
        control={form.control}
        name="customerName"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>{t('convPage.customerNameLabel', 'Customer name *')}</FormLabel>
            <FormControl>
              <Input
                {...field}
                onChange={(e) => handleNameChange(e.target.value, field.onChange)}
                onBlur={field.onBlur}
                placeholder={t('convPage.customerNamePlaceholder', 'For example: John Smith')}
                className={cn(
                  "bg-background transition-colors",
                  fieldState.error && "border-destructive",
                  nameValidation === 'valid' && !fieldState.error && "border-green-500 focus:ring-green-500"
                )}
              />
            </FormControl>
            <FormDescription>
              {t('convPage.customerNameDescription', 'Who is this appointment for?')}
            </FormDescription>
            {!fieldState.error && nameValidation !== 'idle' && (
              <ValidationFeedback status={nameValidation} />
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Customer Email */}
      <FormField
        control={form.control}
        name="customerEmail"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>{t('convPage.emailLabel', 'Email')}</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="email"
                onBlur={(e) => {
                  field.onBlur();
                  handleEmailBlur(e.target.value);
                }}
                placeholder={t('convPage.emailPlaceholder', 'name@example.com')}
                className={cn(
                  "bg-background transition-colors",
                  fieldState.error && "border-destructive",
                  emailValidation === 'valid' && !fieldState.error && "border-green-500 focus:ring-green-500"
                )}
              />
            </FormControl>
            <FormDescription>
              {t('convPage.emailDescription', 'For confirmation and reminders (optional)')}
            </FormDescription>
            {!fieldState.error && emailValidation !== 'idle' && (
              <ValidationFeedback status={emailValidation} />
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Customer Phone */}
      <FormField
        control={form.control}
        name="customerPhone"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>{t('convPage.phoneLabel', 'Phone number')}</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="tel"
                onChange={(e) => handlePhoneChange(e.target.value, field.onChange)}
                onBlur={field.onBlur}
                placeholder={t('convPage.phonePlaceholder', '+31 6 12345678')}
                className={cn(
                  "bg-background transition-colors",
                  fieldState.error && "border-destructive",
                  phoneValidation === 'valid' && !fieldState.error && "border-green-500 focus:ring-green-500"
                )}
              />
            </FormControl>
            <FormDescription>
              {t('convPage.phoneDescription', 'For WhatsApp notifications (optional). Include the country code, e.g. +31 for the Netherlands.')}
            </FormDescription>
            {!fieldState.error && phoneValidation !== 'idle' && (
              <ValidationFeedback status={phoneValidation} />
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Service Type Selection */}
      {serviceTypes.length > 0 && (
        <FormField
          control={form.control}
          name="serviceTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('convPage.serviceTypeLabel', 'Service Type')}</FormLabel>
              <Select onValueChange={onServiceTypeChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t('convPage.serviceTypePlaceholder', 'Select service type')} />
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

      {/* Location */}
      <FormField
        control={form.control}
        name="location"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>{t('convPage.locationLabel', 'Location (optional)')}</FormLabel>
            <FormControl>
              <Input
                {...field}
                onChange={(e) => handleLocationChange(e.target.value, field.onChange)}
                placeholder={t('convPage.locationPlaceholder', 'For example: 123 Main Street, Amsterdam')}
                className={cn(
                  "bg-background transition-colors",
                  fieldState.error && "border-destructive",
                  locationValidation === 'valid' && !fieldState.error && "border-green-500 focus:ring-green-500"
                )}
              />
            </FormControl>
            {!fieldState.error && locationValidation !== 'idle' && (
              <ValidationFeedback status={locationValidation} />
            )}
            <FormMessage />
          </FormItem>
        )}
      />


      {/* Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('convPage.descriptionLabel', 'Description')}</FormLabel>
            <FormControl>
              <Textarea
                value={field.value || ''}
                onChange={(e) => {
                  // Basic sanitization without trim (allow spaces while typing)
                  const sanitized = e.target.value.replace(/[<>]/g, '');
                  field.onChange(sanitized);
                }}
                placeholder={t('convPage.descriptionPlaceholder', 'Extra information about the appointment')}
                className="bg-background"
                rows={3}
              />
            </FormControl>
            <FormDescription>
              {t('convPage.descriptionDescription', 'Optional details about the appointment (max 2000 characters)')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
