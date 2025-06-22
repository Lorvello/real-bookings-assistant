
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { BookingFormData } from './bookingSchema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface BookingDateTimeFieldsProps {
  form: UseFormReturn<BookingFormData>;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
  autoUpdateEndTime: boolean;
  onAutoUpdateChange: (checked: boolean) => void;
  onTimeChange: (field: 'startTime' | 'endTime', value: string) => void;
  calculateDuration: () => number;
}

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes}`;
  return { value: timeString, label: timeString };
});

export function BookingDateTimeFields({ 
  form, 
  isAllDay, 
  startTime, 
  endTime, 
  autoUpdateEndTime, 
  onAutoUpdateChange, 
  onTimeChange, 
  calculateDuration 
}: BookingDateTimeFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Datum */}
      <FormField
        control={form.control}
        name="date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Datum *</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal bg-background",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Selecteer een datum</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) => date < new Date("1900-01-01")}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Hele dag toggle */}
      <FormField
        control={form.control}
        name="isAllDay"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="text-sm font-normal">Hele dag</FormLabel>
          </FormItem>
        )}
      />

      {/* Tijd selectie */}
      {!isAllDay && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start tijd</FormLabel>
                  <Select onValueChange={(value) => onTimeChange('startTime', value)} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecteer tijd" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions.map((option) => (
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
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Eind tijd</FormLabel>
                  <Select onValueChange={(value) => onTimeChange('endTime', value)} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecteer tijd" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions.map((option) => (
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

          {/* Duration indicator */}
          {startTime && endTime && (
            <div className="text-sm text-muted-foreground">
              Duur: {calculateDuration()} minuten ({(calculateDuration() / 60).toFixed(1)} uur)
            </div>
          )}

          {/* Auto-update toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="auto-update" 
              checked={autoUpdateEndTime} 
              onCheckedChange={(checked) => onAutoUpdateChange(checked === true)} 
            />
            <label htmlFor="auto-update" className="text-sm text-muted-foreground">
              Automatisch eindtijd berekenen op basis van service type
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
