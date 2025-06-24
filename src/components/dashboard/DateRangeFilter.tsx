
import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
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
import { format } from 'date-fns';

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
  const [selectingStartDate, setSelectingStartDate] = useState(true);

  const handlePresetSelect = (preset: DateRangePreset) => {
    const range = getPresetRange(preset);
    onRangeChange(range);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (selectingStartDate) {
      setCustomStartDate(date);
      setCustomEndDate(undefined);
      setSelectingStartDate(false);
    } else {
      if (customStartDate && date < customStartDate) {
        setCustomStartDate(date);
        setCustomEndDate(customStartDate);
      } else {
        setCustomEndDate(date);
      }
    }
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
    setSelectingStartDate(true);
    setIsCustomDialogOpen(true);
  };

  const resetSelection = () => {
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setSelectingStartDate(true);
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
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg font-semibold text-foreground text-center">
              Select Date Range
            </DialogTitle>
          </DialogHeader>
          
          {/* Compact step indicator */}
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                selectingStartDate ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <span>1. Start</span>
                {customStartDate && (
                  <span className="bg-background/20 px-1 rounded">
                    {format(customStartDate, 'MMM d')}
                  </span>
                )}
              </div>
              <div className="w-4 h-px bg-border"></div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                !selectingStartDate ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <span>2. End</span>
                {customEndDate && (
                  <span className="bg-background/20 px-1 rounded">
                    {format(customEndDate, 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Simple instruction */}
          <p className="text-center text-sm text-muted-foreground mb-3">
            {selectingStartDate ? "Choose start date" : "Choose end date"}
          </p>

          {/* Clean calendar using standard Shadcn styling */}
          <div className="flex justify-center">
            <CalendarComponent
              mode="single"
              selected={selectingStartDate ? customStartDate : customEndDate}
              onSelect={handleDateSelect}
              className="pointer-events-auto"
            />
          </div>

          {/* Compact selected range display */}
          {customStartDate && customEndDate && (
            <div className="bg-muted rounded p-3 mt-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Selected Range</p>
                <p className="text-sm font-medium text-foreground">
                  {format(customStartDate, 'MMM d, yyyy')} - {format(customEndDate, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <Button 
              variant="outline" 
              onClick={resetSelection}
              size="sm"
              className="w-full sm:w-auto"
            >
              Reset
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsCustomDialogOpen(false)}
              size="sm"
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCustomRangeApply}
              disabled={!customStartDate || !customEndDate}
              size="sm"
              className="w-full sm:w-auto"
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
