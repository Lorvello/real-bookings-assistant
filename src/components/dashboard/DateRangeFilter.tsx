
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
      setCustomEndDate(undefined); // Reset end date when start date changes
      setSelectingStartDate(false); // Switch to selecting end date
    } else {
      // Ensure end date is not before start date
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
        <DialogContent className="max-w-md bg-[#1F2937] border border-[#374151]">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold text-white text-center">
              Select Date Range
            </DialogTitle>
          </DialogHeader>
          
          {/* Step indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                selectingStartDate ? 'bg-[#10B981] text-white' : 'bg-[#374151] text-gray-300'
              }`}>
                <span className="text-sm font-medium">1. Start Date</span>
                {customStartDate && (
                  <span className="text-xs bg-black/20 px-2 py-1 rounded">
                    {format(customStartDate, 'MMM d')}
                  </span>
                )}
              </div>
              <div className="w-8 h-px bg-[#374151]"></div>
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                !selectingStartDate ? 'bg-[#10B981] text-white' : 'bg-[#374151] text-gray-300'
              }`}>
                <span className="text-sm font-medium">2. End Date</span>
                {customEndDate && (
                  <span className="text-xs bg-black/20 px-2 py-1 rounded">
                    {format(customEndDate, 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center mb-4">
            <p className="text-gray-300 text-sm">
              {selectingStartDate 
                ? "Choose your start date" 
                : "Choose your end date"
              }
            </p>
          </div>

          {/* Single Calendar */}
          <div className="flex justify-center">
            <div className="bg-[#111827] rounded-xl border border-[#374151] p-4 shadow-lg">
              <CalendarComponent
                mode="single"
                selected={selectingStartDate ? customStartDate : customEndDate}
                onSelect={handleDateSelect}
                className="p-0 pointer-events-auto text-white [&_.rdp-months]:flex [&_.rdp-months]:justify-center [&_.rdp-caption]:flex [&_.rdp-caption]:justify-center [&_.rdp-caption]:pt-2 [&_.rdp-caption]:relative [&_.rdp-caption]:items-center [&_.rdp-caption_label]:text-lg [&_.rdp-caption_label]:font-bold [&_.rdp-caption_label]:text-white [&_.rdp-nav]:space-x-1 [&_.rdp-nav]:flex [&_.rdp-nav]:items-center [&_.rdp-nav_button]:h-9 [&_.rdp-nav_button]:w-9 [&_.rdp-nav_button]:bg-[#374151] [&_.rdp-nav_button]:text-white [&_.rdp-nav_button]:p-0 [&_.rdp-nav_button]:opacity-80 [&_.rdp-nav_button]:hover:opacity-100 [&_.rdp-nav_button]:hover:bg-[#10B981] [&_.rdp-nav_button]:rounded-lg [&_.rdp-nav_button]:transition-all [&_.rdp-nav_button]:border [&_.rdp-nav_button]:border-[#4B5563] [&_.rdp-nav_button]:hover:border-[#10B981] [&_.rdp-nav_button_previous]:absolute [&_.rdp-nav_button_previous]:left-1 [&_.rdp-nav_button_next]:absolute [&_.rdp-nav_button_next]:right-1 [&_.rdp-table]:w-full [&_.rdp-table]:border-collapse [&_.rdp-table]:mt-4 [&_.rdp-head_row]:flex [&_.rdp-head_row]:mb-2 [&_.rdp-head_cell]:text-gray-400 [&_.rdp-head_cell]:rounded-md [&_.rdp-head_cell]:w-10 [&_.rdp-head_cell]:font-semibold [&_.rdp-head_cell]:text-xs [&_.rdp-head_cell]:text-center [&_.rdp-head_cell]:py-2 [&_.rdp-row]:flex [&_.rdp-row]:w-full [&_.rdp-row]:mb-1 [&_.rdp-cell]:h-10 [&_.rdp-cell]:w-10 [&_.rdp-cell]:text-center [&_.rdp-cell]:text-sm [&_.rdp-cell]:p-0 [&_.rdp-cell]:relative [&_.rdp-button]:h-10 [&_.rdp-button]:w-10 [&_.rdp-button]:p-0 [&_.rdp-button]:font-semibold [&_.rdp-button]:text-white [&_.rdp-button]:hover:bg-[#374151] [&_.rdp-button]:hover:text-white [&_.rdp-button]:rounded-lg [&_.rdp-button]:transition-all [&_.rdp-button]:border [&_.rdp-button]:border-transparent [&_.rdp-button]:hover:border-[#4B5563] [&_.rdp-day_selected]:bg-[#10B981] [&_.rdp-day_selected]:text-white [&_.rdp-day_selected]:hover:bg-[#059669] [&_.rdp-day_selected]:hover:text-white [&_.rdp-day_selected]:focus:bg-[#10B981] [&_.rdp-day_selected]:focus:text-white [&_.rdp-day_selected]:border-[#10B981] [&_.rdp-day_selected]:shadow-lg [&_.rdp-day_today]:bg-[#374151] [&_.rdp-day_today]:text-white [&_.rdp-day_today]:font-bold [&_.rdp-day_today]:border-[#10B981] [&_.rdp-day_today]:border-2 [&_.rdp-day_outside]:text-gray-600 [&_.rdp-day_outside]:opacity-40 [&_.rdp-day_disabled]:text-gray-700 [&_.rdp-day_disabled]:opacity-30 [&_.rdp-day_disabled]:cursor-not-allowed [&_.rdp-day_hidden]:invisible"
              />
            </div>
          </div>

          {/* Selected Range Summary */}
          {customStartDate && customEndDate && (
            <div className="bg-[#111827] rounded-lg p-4 border border-[#374151] mt-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-1">Selected Range</p>
                <p className="text-white font-bold text-lg">
                  {format(customStartDate, 'MMM d, yyyy')} - {format(customEndDate, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <Button 
              variant="outline" 
              onClick={resetSelection}
              className="bg-[#374151] border-[#4B5563] text-white hover:bg-[#4B5563] hover:text-white transition-colors w-full sm:w-auto"
            >
              Reset
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsCustomDialogOpen(false)}
              className="bg-[#374151] border-[#4B5563] text-white hover:bg-[#4B5563] hover:text-white transition-colors w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCustomRangeApply}
              disabled={!customStartDate || !customEndDate}
              className="bg-[#10B981] hover:bg-[#059669] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
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
