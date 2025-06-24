
import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths } from 'date-fns';

export type DateRangePreset = 'last7days' | 'last30days' | 'last3months' | 'lastyear' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DateRangePreset;
  label: string;
}

interface DateRangeFilterProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

const getPresetRange = (preset: DateRangePreset): DateRange => {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  switch (preset) {
    case 'last7days':
      return {
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate,
        preset,
        label: 'Last 7 days'
      };
    case 'last30days':
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate,
        preset,
        label: 'Last 30 days'
      };
    case 'last3months':
      return {
        startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate,
        preset,
        label: 'Last 3 months'
      };
    case 'lastyear':
      return {
        startDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        endDate,
        preset,
        label: 'Last year'
      };
    default:
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate,
        preset: 'last30days',
        label: 'Last 30 days'
      };
  }
};

export function DateRangeFilter({ selectedRange, onRangeChange }: DateRangeFilterProps) {
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(selectedRange.startDate);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(selectedRange.endDate);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'start' | 'end'>('start');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const handlePresetSelect = (preset: DateRangePreset) => {
    const range = getPresetRange(preset);
    onRangeChange(range);
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setCustomStartDate(date);
    setCustomEndDate(undefined); // Reset end date when start date changes
    setCurrentStep('end'); // Move to end date selection
    
    // Set the calendar to show the month of the selected start date
    setCurrentMonth(date);
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (!date || !customStartDate) return;
    
    // Prevent selecting end date before start date
    if (date < customStartDate) {
      return;
    }
    
    setCustomEndDate(date);
  };

  const handleCustomRangeApply = () => {
    if (customStartDate && customEndDate) {
      const range: DateRange = {
        startDate: customStartDate,
        endDate: customEndDate,
        preset: 'custom',
        label: `${format(customStartDate, 'MMM d')} - ${format(customEndDate, 'MMM d, yyyy')}`
      };
      onRangeChange(range);
      setIsCustomDialogOpen(false);
    }
  };

  const openCustomDialog = () => {
    setCustomStartDate(selectedRange.startDate);
    setCustomEndDate(selectedRange.endDate);
    setCurrentStep('start');
    setCurrentMonth(new Date()); // Start with current month
    setIsCustomDialogOpen(true);
  };

  const resetSelection = () => {
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setCurrentStep('start');
    setCurrentMonth(new Date());
  };

  const goBackToStartDate = () => {
    setCurrentStep('start');
    setCustomEndDate(undefined);
    if (customStartDate) {
      setCurrentMonth(customStartDate);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const isDateDisabledForEndDate = (date: Date) => {
    if (!customStartDate) return true;
    return date < customStartDate || date > new Date();
  };

  const isDateDisabledForStartDate = (date: Date) => {
    return date > new Date();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="bg-card border-border text-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {selectedRange.label}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 bg-card border-border z-50" align="end">
          <DropdownMenuItem 
            onClick={() => handlePresetSelect('last7days')}
            className="text-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground"
          >
            Last 7 days
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handlePresetSelect('last30days')}
            className="text-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground"
          >
            Last 30 days
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handlePresetSelect('last3months')}
            className="text-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground"
          >
            Last 3 months
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handlePresetSelect('lastyear')}
            className="text-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground"
          >
            Last year
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem 
            onClick={openCustomDialog}
            className="text-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground"
          >
            Custom range...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold text-foreground text-center">
              Select Date Range
            </DialogTitle>
          </DialogHeader>
          
          {/* Step indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                currentStep === 'start' 
                  ? 'bg-green-600 text-white' 
                  : customStartDate 
                    ? 'bg-green-100 text-green-800 border border-green-300' 
                    : 'bg-muted text-muted-foreground'
              }`}>
                1. Start Date
                {customStartDate && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    {format(customStartDate, 'MMM d')}
                  </span>
                )}
              </div>

              <div className="w-8 h-px bg-border"></div>

              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                currentStep === 'end' 
                  ? 'bg-green-600 text-white' 
                  : customEndDate 
                    ? 'bg-green-100 text-green-800 border border-green-300' 
                    : 'bg-muted text-muted-foreground'
              }`}>
                2. End Date
                {customEndDate && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    {format(customEndDate, 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <p className="text-center text-sm text-muted-foreground mb-6">
            {currentStep === 'start' 
              ? "Choose your start date" 
              : "Choose your end date (must be after start date)"}
          </p>

          {/* Custom month navigation */}
          <div className="flex items-center justify-between mb-6 px-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h3 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar */}
          <div className="flex justify-center px-4">
            <CalendarComponent
              mode="single"
              selected={currentStep === 'start' ? customStartDate : customEndDate}
              onSelect={currentStep === 'start' ? handleStartDateSelect : handleEndDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              disabled={currentStep === 'start' ? isDateDisabledForStartDate : isDateDisabledForEndDate}
              showOutsideDays={false}
              className="pointer-events-auto"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border border-border",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-2",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex items-center justify-center",
                row: "flex w-full mt-3",
                cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md flex items-center justify-center",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
              components={{
                Chevron: () => null, // Hide default chevrons since we have custom ones
              }}
            />
          </div>

          {/* Selected range summary */}
          {customStartDate && customEndDate && (
            <div className="bg-muted/50 rounded-lg p-4 mt-6 border border-border/50">
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                  Selected Range
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {format(customStartDate, 'MMM d, yyyy')} - {format(customEndDate, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-6 gap-2">
            {currentStep === 'end' && (
              <Button 
                variant="outline" 
                onClick={goBackToStartDate}
                size="sm"
              >
                ← Back to Start Date
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={resetSelection}
              size="sm"
            >
              Reset
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setIsCustomDialogOpen(false)}
              size="sm"
            >
              Cancel
            </Button>
            
            <Button 
              onClick={handleCustomRangeApply}
              disabled={!customStartDate || !customEndDate}
              size="sm"
            >
              Apply Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Export the helper function for use in other components
export { getPresetRange };
