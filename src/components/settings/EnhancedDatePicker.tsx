import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EnhancedDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function EnhancedDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled
}: EnhancedDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(value || new Date());

  // Generate year options from 1900 to current year + 10
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let year = currentYear + 10; year >= 1900; year--) {
    yearOptions.push({ value: year.toString(), label: year.toString() });
  }

  // Generate month options
  const monthOptions = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];

  const handleYearChange = (year: string) => {
    const newDate = new Date(displayMonth);
    newDate.setFullYear(parseInt(year));
    setDisplayMonth(newDate);
  };

  const handleMonthChange = (month: string) => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(parseInt(month));
    setDisplayMonth(newDate);
  };

  const handleDateSelect = (date: Date | undefined) => {
    onChange(date);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-muted border-white/[0.08] text-foreground hover:bg-white/[0.06]",
            !value && "text-subtle-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-popover border-white/[0.08]" align="start">
        <div className="flex items-center justify-between p-3 border-b border-white/[0.08]">
          <div className="flex gap-2">
            <Select
              value={displayMonth.getMonth().toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-32 bg-secondary border-white/[0.08] text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-white/[0.08]">
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={displayMonth.getFullYear().toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-20 bg-secondary border-white/[0.08] text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-white/[0.08] max-h-60">
                {yearOptions.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          className="pointer-events-auto bg-transparent border-0"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-medium text-foreground",
            nav: "space-x-1 flex items-center",
            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-foreground",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-subtle-foreground rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary/15 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: "h-9 w-9 p-0 font-normal text-foreground hover:bg-white/[0.06] rounded-md transition-colors",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-white/[0.06] text-foreground ring-1 ring-primary/40",
            day_outside: "text-subtle-foreground opacity-50",
            day_disabled: "text-subtle-foreground opacity-50",
            day_range_middle: "aria-selected:bg-primary/15 aria-selected:text-foreground",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}