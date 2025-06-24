
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

  const handlePresetSelect = (preset: DateRangePreset) => {
    const range = getPresetRange(preset);
    onRangeChange(range);
  };

  const handleCustomRangeApply = () => {
    if (customStartDate && customEndDate) {
      // Validate that end date is after start date
      if (customEndDate < customStartDate) {
        // Swap dates if they're in wrong order
        const temp = customStartDate;
        setCustomStartDate(customEndDate);
        setCustomEndDate(temp);
        return;
      }

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
    setIsCustomDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {selectedRange.label}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 bg-gray-800 border-gray-700" align="end">
          <DropdownMenuItem 
            onClick={() => handlePresetSelect('last7days')}
            className="text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Last 7 days
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handlePresetSelect('last30days')}
            className="text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Last 30 days
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handlePresetSelect('last3months')}
            className="text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Last 3 months
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handlePresetSelect('lastyear')}
            className="text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Last year
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuItem 
            onClick={openCustomDialog}
            className="text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Custom range...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Select Custom Date Range</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Start Date</label>
              <div className="border border-gray-600 rounded-lg">
                <CalendarComponent
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  className="pointer-events-auto"
                  classNames={{
                    months: "text-white",
                    month: "space-y-4",
                    caption: "text-white",
                    caption_label: "text-white",
                    nav_button: "text-gray-400 hover:text-white",
                    head_cell: "text-gray-400",
                    cell: "text-white",
                    day: "text-white hover:bg-gray-700",
                    day_selected: "bg-blue-600 text-white hover:bg-blue-700",
                    day_today: "bg-gray-700 text-white"
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">End Date</label>
              <div className="border border-gray-600 rounded-lg">
                <CalendarComponent
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  className="pointer-events-auto"
                  classNames={{
                    months: "text-white",
                    month: "space-y-4",
                    caption: "text-white",
                    caption_label: "text-white",
                    nav_button: "text-gray-400 hover:text-white",
                    head_cell: "text-gray-400",
                    cell: "text-white",
                    day: "text-white hover:bg-gray-700",
                    day_selected: "bg-blue-600 text-white hover:bg-blue-700",
                    day_today: "bg-gray-700 text-white"
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCustomDialogOpen(false)}
              className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCustomRangeApply}
              disabled={!customStartDate || !customEndDate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
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
