
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { BookingFormData } from './bookingSchema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BookingReminderFieldsProps {
  form: UseFormReturn<BookingFormData>;
  hasReminder: boolean;
}

const reminderOptions = [
  { value: '15', label: '15 minuten' },
  { value: '30', label: '30 minuten' },
  { value: '60', label: '1 uur' },
  { value: '120', label: '2 uur' },
  { value: '1440', label: '1 dag' },
];

export function BookingReminderFields({ form, hasReminder }: BookingReminderFieldsProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="hasReminder"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="text-sm font-normal">Herinnering instellen</FormLabel>
          </FormItem>
        )}
      />

      {hasReminder && (
        <FormField
          control={form.control}
          name="reminderTiming"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Herinnering timing</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecteer timing" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {reminderOptions.map((option) => (
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
      )}
    </div>
  );
}
