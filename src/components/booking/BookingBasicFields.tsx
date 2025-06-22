
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { BookingFormData } from './bookingSchema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  return (
    <div className="space-y-6">
      {/* Titel */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Titel *</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Voer een titel in" className="bg-background" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Service Type Selectie */}
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
                    <SelectValue placeholder="Selecteer service type" />
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

      {/* Locatie */}
      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Locatie</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Voer een locatie in" className="bg-background" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Beschrijving */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Beschrijving</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                placeholder="Voer een beschrijving in" 
                className="bg-background"
                rows={3}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
