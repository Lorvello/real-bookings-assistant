import React, { useState } from 'react';
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
    
    const result = validatePhoneNumber(value, { defaultCountry: 'NL' });
    if (!result.valid) {
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
            <FormLabel>Title *</FormLabel>
            <FormControl>
              <Input
                {...field}
                onChange={(e) => handleTitleChange(e.target.value, field.onChange)}
                onBlur={field.onBlur}
                placeholder="For example: Haircut for John"
                className={cn(
                  "bg-background transition-colors",
                  fieldState.error && "border-destructive",
                  titleValidation === 'valid' && !fieldState.error && "border-green-500 focus:ring-green-500"
                )}
              />
            </FormControl>
            <FormDescription>
              A clear title helps you keep your appointments organized
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
            <FormLabel>Customer name *</FormLabel>
            <FormControl>
              <Input
                {...field}
                onChange={(e) => handleNameChange(e.target.value, field.onChange)}
                onBlur={field.onBlur}
                placeholder="For example: John Smith"
                className={cn(
                  "bg-background transition-colors",
                  fieldState.error && "border-destructive",
                  nameValidation === 'valid' && !fieldState.error && "border-green-500 focus:ring-green-500"
                )}
              />
            </FormControl>
            <FormDescription>
              Who is this appointment for?
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
                placeholder="name@example.com"
                className={cn(
                  "bg-background transition-colors",
                  fieldState.error && "border-destructive",
                  emailValidation === 'valid' && !fieldState.error && "border-green-500 focus:ring-green-500"
                )}
              />
            </FormControl>
            <FormDescription>
              For confirmation and reminders (optional)
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
            <FormLabel>Phone number</FormLabel>
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
              For WhatsApp notifications (optional)
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
            <FormLabel>Location (optional)</FormLabel>
            <FormControl>
              <Input
                {...field}
                onChange={(e) => handleLocationChange(e.target.value, field.onChange)}
                placeholder="For example: 123 Main Street, Amsterdam"
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
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea 
                value={field.value || ''}
                onChange={(e) => {
                  // Basic sanitization without trim (allow spaces while typing)
                  const sanitized = e.target.value.replace(/[<>]/g, '');
                  field.onChange(sanitized);
                }}
                placeholder="Extra information about the appointment"
                className="bg-background"
                rows={3}
              />
            </FormControl>
            <FormDescription>
              Optional details about the appointment (max 2000 characters)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
