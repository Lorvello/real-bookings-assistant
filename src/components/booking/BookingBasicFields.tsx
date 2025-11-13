import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { BookingFormData } from './bookingSchema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { validateEmail, validatePhoneNumber, sanitizeText } from '@/utils/inputSanitization';
import { secureLogger } from '@/utils/secureLogger';
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
  const [titleValidation, setTitleValidation] = useState<'valid' | 'warning' | 'error' | 'idle'>('idle');
  const [nameValidation, setNameValidation] = useState<'valid' | 'warning' | 'error' | 'idle'>('idle');
  const [emailValidation, setEmailValidation] = useState<'valid' | 'warning' | 'error' | 'idle'>('idle');
  const [phoneValidation, setPhoneValidation] = useState<'valid' | 'warning' | 'error' | 'idle'>('idle');
  const [locationValidation, setLocationValidation] = useState<'valid' | 'warning' | 'error' | 'idle'>('idle');

  const handleTitleChange = (value: string, onChange: (value: string) => void) => {
    const result = sanitizeText(value);
    
    if (value !== result.sanitized) {
      secureLogger.security('Suspicious booking title detected', { 
        original: value.substring(0, 20),
        component: 'BookingBasicFields'
      });
      setTitleValidation('warning');
    } else if (result.sanitized.length > 200) {
      setTitleValidation('error');
    } else if (result.sanitized.length > 0) {
      setTitleValidation('valid');
    } else {
      setTitleValidation('idle');
    }
    
    onChange(result.sanitized);
  };

  const handleEmailBlur = (value: string) => {
    if (!value) {
      setEmailValidation('idle');
      return;
    }
    
    const result = validateEmail(value);
    if (!result.valid && result.suspicious) {
      secureLogger.security('Suspicious email detected', { 
        patterns: result.errors,
        component: 'BookingBasicFields'
      });
      setEmailValidation('warning');
    } else if (!result.valid) {
      setEmailValidation('error');
    } else {
      setEmailValidation('valid');
    }
  };

  const handleNameChange = (value: string, onChange: (value: string) => void) => {
    const result = sanitizeText(value);
    
    if (value !== result.sanitized) {
      secureLogger.security('Suspicious customer name detected', { 
        original: value.substring(0, 20),
        component: 'BookingBasicFields'
      });
      setNameValidation('warning');
    } else if (result.sanitized.length > 200) {
      setNameValidation('error');
    } else if (result.sanitized.length > 0) {
      setNameValidation('valid');
    } else {
      setNameValidation('idle');
    }
    
    onChange(result.sanitized);
  };

  const handlePhoneChange = (value: string, onChange: (value: string) => void) => {
    if (!value) {
      setPhoneValidation('idle');
      onChange('');
      return;
    }
    
    const result = validatePhoneNumber(value, { defaultCountry: 'NL' });
    if (!result.valid && result.suspicious) {
      secureLogger.security('Suspicious phone number detected', { 
        component: 'BookingBasicFields'
      });
      setPhoneValidation('warning');
    } else if (!result.valid) {
      setPhoneValidation('error');
    } else {
      setPhoneValidation('valid');
    }
    
    onChange(value);
  };

  const handleLocationChange = (value: string, onChange: (value: string) => void) => {
    if (!value) {
      setLocationValidation('idle');
      onChange('');
      return;
    }

    const result = sanitizeText(value);
    if (result.sanitized.length > 500) {
      setLocationValidation('error');
    } else {
      setLocationValidation('valid');
    }
    
    onChange(result.sanitized);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <FormField
        control={form.control}
        name="title"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Titel *</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                onChange={(e) => handleTitleChange(e.target.value, field.onChange)}
                onBlur={field.onBlur}
                placeholder="Bijvoorbeeld: Kapperbeurt voor Jan"
                className={cn(
                  "bg-background transition-colors",
                  fieldState.error && "border-destructive",
                  titleValidation === 'valid' && !fieldState.error && "border-green-500 focus:ring-green-500"
                )}
              />
            </FormControl>
            <FormDescription>
              Een duidelijke titel helpt bij het organiseren van afspraken
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
            <FormLabel>Naam klant *</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                onChange={(e) => handleNameChange(e.target.value, field.onChange)}
                onBlur={field.onBlur}
                placeholder="Bijvoorbeeld: Jan Jansen"
                className={cn(
                  "bg-background transition-colors",
                  fieldState.error && "border-destructive",
                  nameValidation === 'valid' && !fieldState.error && "border-green-500 focus:ring-green-500"
                )}
              />
            </FormControl>
            <FormDescription>
              Voor wie is deze afspraak?
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
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                type="email"
                onBlur={(e) => {
                  field.onBlur();
                  handleEmailBlur(e.target.value);
                }}
                placeholder="naam@voorbeeld.nl"
                className={cn(
                  "bg-background transition-colors",
                  fieldState.error && "border-destructive",
                  emailValidation === 'valid' && !fieldState.error && "border-green-500 focus:ring-green-500"
                )}
              />
            </FormControl>
            <FormDescription>
              Voor bevestiging en herinneringen (optioneel)
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
            <FormLabel>Telefoonnummer</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                type="tel"
                onChange={(e) => handlePhoneChange(e.target.value, field.onChange)}
                onBlur={field.onBlur}
                placeholder="06 12345678"
                className={cn(
                  "bg-background transition-colors",
                  fieldState.error && "border-destructive",
                  phoneValidation === 'valid' && !fieldState.error && "border-green-500 focus:ring-green-500"
                )}
              />
            </FormControl>
            <FormDescription>
              Voor WhatsApp notificaties (optioneel)
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
              <FormLabel>Service Type</FormLabel>
              <Select onValueChange={onServiceTypeChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select service type" />
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
            <FormLabel>Locatie (optioneel)</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                onChange={(e) => handleLocationChange(e.target.value, field.onChange)}
                placeholder="Bijvoorbeeld: Hoofdstraat 123, Amsterdam"
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
            <FormLabel>Beschrijving</FormLabel>
            <FormControl>
              <Textarea 
                value={field.value || ''}
                onChange={(e) => {
                  const sanitized = sanitizeText(e.target.value);
                  field.onChange(sanitized.sanitized);
                }}
                placeholder="Extra informatie over de afspraak"
                className="bg-background"
                rows={3}
              />
            </FormControl>
            <FormDescription>
              Optionele details over de afspraak (max 2000 tekens)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
