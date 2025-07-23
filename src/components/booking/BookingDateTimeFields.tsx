
import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { BookingFormData } from './bookingSchema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface BookingDateTimeFieldsProps {
  form: UseFormReturn<BookingFormData>;
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
  startTime, 
  endTime, 
  autoUpdateEndTime, 
  onAutoUpdateChange, 
  onTimeChange, 
  calculateDuration 
}: BookingDateTimeFieldsProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined, onChange: (date: Date | undefined) => void) => {
    onChange(date);
    // Close the calendar with a small delay for smooth animation
    setTimeout(() => {
      setIsCalendarOpen(false);
    }, 150);
  };

  return (
    <div className="space-y-6">
      {/* Date */}
      <FormField
        control={form.control}
        name="date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Date *</FormLabel>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal bg-background transition-all duration-200",
                      !field.value && "text-muted-foreground",
                      isCalendarOpen && "ring-2 ring-primary/50"
                    )}
                    onClick={() => setIsCalendarOpen(true)}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Select a date</span>
                    )}
                    <CalendarIcon className={cn(
                      "ml-auto h-4 w-4 opacity-50 transition-transform duration-200",
                      isCalendarOpen && "rotate-180"
                    )} />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0 animate-in fade-in slide-in-from-top-2 duration-200" 
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={(date) => handleDateSelect(date, field.onChange)}
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

      {/* Time selection with both input and dropdown */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start time *</FormLabel>
                <div className="space-y-2">
                  <FormControl>
                    <Input
                      {...field}
                      type="time"
                      className="bg-background"
                      onChange={(e) => onTimeChange('startTime', e.target.value)}
                    />
                  </FormControl>
                  <Select onValueChange={(value) => onTimeChange('startTime', value)} value={field.value}>
                    <SelectTrigger className="bg-background text-xs">
                      <SelectValue placeholder="Quick select" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End time *</FormLabel>
                <div className="space-y-2">
                  <FormControl>
                    <Input
                      {...field}
                      type="time"
                      className="bg-background"
                      onChange={(e) => onTimeChange('endTime', e.target.value)}
                      disabled={autoUpdateEndTime}
                    />
                  </FormControl>
                  <Select 
                    onValueChange={(value) => onTimeChange('endTime', value)} 
                    value={field.value}
                    disabled={autoUpdateEndTime}
                  >
                    <SelectTrigger className="bg-background text-xs">
                      <SelectValue placeholder="Quick select" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Duration indicator */}
        {startTime && endTime && (
          <div className="text-sm text-muted-foreground animate-in fade-in duration-500">
            Duration: {calculateDuration()} minutes ({(calculateDuration() / 60).toFixed(1)} hours)
          </div>
        )}

        {/* Auto-update toggle */}
        <div className="flex items-center space-x-2 animate-in fade-in duration-700">
          <Checkbox 
            id="auto-update" 
            checked={autoUpdateEndTime} 
            onCheckedChange={(checked) => onAutoUpdateChange(checked === true)} 
          />
          <label htmlFor="auto-update" className="text-sm text-muted-foreground">
            Automatically calculate end time based on service type
          </label>
        </div>
      </div>
    </div>
  );
}
