
import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { BookingFormData } from './bookingSchema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProfessionalTimePicker } from '@/components/availability/ProfessionalTimePicker';
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
  const [isStartTimePickerOpen, setIsStartTimePickerOpen] = useState(false);
  const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false);

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

      {/* Time selection with professional time pickers */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start time *</FormLabel>
                <FormControl>
                  <ProfessionalTimePicker
                    value={field.value || ''}
                    onChange={(value) => onTimeChange('startTime', value)}
                    isOpen={isStartTimePickerOpen}
                    onToggle={() => {
                      setIsStartTimePickerOpen(!isStartTimePickerOpen);
                      if (isEndTimePickerOpen) setIsEndTimePickerOpen(false);
                    }}
                    onClose={() => setIsStartTimePickerOpen(false)}
                  />
                </FormControl>
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
                <FormControl>
                  <div className={cn(autoUpdateEndTime && "opacity-50 pointer-events-none")}>
                    <ProfessionalTimePicker
                      value={field.value || ''}
                      onChange={(value) => onTimeChange('endTime', value)}
                      isOpen={isEndTimePickerOpen && !autoUpdateEndTime}
                      onToggle={() => {
                        if (!autoUpdateEndTime) {
                          setIsEndTimePickerOpen(!isEndTimePickerOpen);
                          if (isStartTimePickerOpen) setIsStartTimePickerOpen(false);
                        }
                      }}
                      onClose={() => setIsEndTimePickerOpen(false)}
                    />
                  </div>
                </FormControl>
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
