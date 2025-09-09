
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth, isAfter, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface CustomRangeCalendarProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onApply: () => void;
  onClear: () => void;
  onCancel: () => void;
}

export function CustomRangeCalendar({ value, onChange, onApply, onClear, onCancel }: CustomRangeCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add days from previous month to fill the grid
  const startDate = new Date(monthStart);
  while (startDate.getDay() !== 1) { // Start on Monday
    startDate.setDate(startDate.getDate() - 1);
  }

  // Add days from next month to fill the grid
  const endDate = new Date(monthEnd);
  while (endDate.getDay() !== 0) { // End on Sunday
    endDate.setDate(endDate.getDate() + 1);
  }

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handleDateClick = (date: Date) => {
    // Check if clicking on an already selected date
    if (value.startDate && isSameDay(date, value.startDate) && !value.endDate) {
      // Clicking on the selected start date when no end date is selected - clear selection
      onChange({
        startDate: null,
        endDate: null
      });
      return;
    }

    if (value.startDate && value.endDate && (isSameDay(date, value.startDate) || isSameDay(date, value.endDate))) {
      // Clicking on either selected date when both are selected - clear selection
      onChange({
        startDate: null,
        endDate: null
      });
      return;
    }

    if (!value.startDate) {
      // No start date selected - set as start date
      onChange({
        startDate: date,
        endDate: null
      });
    } else if (!value.endDate) {
      // Start date exists but no end date - set as end date
      if (isBefore(date, value.startDate)) {
        // If selected date is before start date, make it the new start date
        onChange({
          startDate: date,
          endDate: null
        });
      } else {
        // Set as end date
        onChange({
          startDate: value.startDate,
          endDate: date
        });
      }
    } else {
      // Both dates are selected - start new selection
      onChange({
        startDate: date,
        endDate: null
      });
    }
  };

  const isInRange = (date: Date) => {
    if (!value.startDate || !value.endDate) return false;
    return isAfter(date, value.startDate) && isBefore(date, value.endDate);
  };

  const isRangeStart = (date: Date) => {
    return value.startDate && isSameDay(date, value.startDate);
  };

  const isRangeEnd = (date: Date) => {
    return value.endDate && isSameDay(date, value.endDate);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleClear = () => {
    onChange({ startDate: null, endDate: null });
    onClear();
  };

  return (
    <div className="p-6 bg-card">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousMonth}
          className="h-8 w-8 p-0 hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h3 className="text-lg font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          className="h-8 w-8 p-0 hover:bg-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 mb-2">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
          <div key={day} className="h-10 flex items-center justify-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Optimized calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {useMemo(() => allDays.map((date) => {
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isSelected = isRangeStart(date) || isRangeEnd(date);
          const isInRangeDate = isInRange(date);
          const isTodayDate = isToday(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              disabled={!isCurrentMonth}
              className={cn(
                "h-10 w-full flex items-center justify-center text-sm font-medium rounded-lg transition-all duration-200 relative",
                // Base styles
                "hover:bg-accent hover:text-accent-foreground",
                // Current month vs other months
                isCurrentMonth 
                  ? "text-foreground" 
                  : "text-muted-foreground opacity-50 cursor-not-allowed",
                // Today styling
                isTodayDate && isCurrentMonth && "bg-accent text-accent-foreground font-bold",
                // Selected styling
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                // Range styling
                isInRangeDate && "bg-primary/20 text-primary",
                // Range start/end specific styling
                isRangeStart(date) && "rounded-l-lg",
                isRangeEnd(date) && "rounded-r-lg",
                // Disable hover on disabled dates
                !isCurrentMonth && "hover:bg-transparent hover:text-muted-foreground"
              )}
            >
              {format(date, 'd')}
            </button>
          );
        }), [allDays, value])}
      </div>

      {/* Selected range display */}
      {(value.startDate || value.endDate) && (
        <div className="mt-6 p-3 bg-muted/50 rounded-lg border">
          <div className="text-sm text-muted-foreground mb-1">Selected Range</div>
          <div className="text-sm font-medium">
            {value.startDate ? format(value.startDate, 'MMM d, yyyy') : 'Select start date'}
            {value.startDate && !value.endDate && ' - Select end date'}
            {value.startDate && value.endDate && ` - ${format(value.endDate, 'MMM d, yyyy')}`}
            {!value.startDate && value.endDate && ` - ${format(value.endDate, 'MMM d, yyyy')}`}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={handleClear}
          size="sm"
        >
          Clear
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={onApply}
            disabled={!value.startDate || !value.endDate}
            size="sm"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
