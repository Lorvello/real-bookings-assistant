import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { BookingFormData } from './bookingSchema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { validateEmail, sanitizeText } from '@/utils/inputSanitization';
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
  const [emailValidation, setEmailValidation] = useState<'valid' | 'warning' | 'error' | 'idle'>('idle');
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
            <FormLabel>Locatie</FormLabel>
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

      {/* Customer Email (for external bookings) */}
      {!form.watch('isInternal') && (
        <FormField
          control={form.control}
          name="customerEmail"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
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
                We sturen een bevestiging naar dit email adres
              </FormDescription>
              {!fieldState.error && emailValidation !== 'idle' && (
                <ValidationFeedback status={emailValidation} />
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )}

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
                  field.onChange(sanitized);
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
