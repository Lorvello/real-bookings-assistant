
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);

  const handlePresetSelect = (preset: DateRangePreset) => {
    const range = getPresetRange(preset);
    onRangeChange(range);
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
      setIsCustomRangeOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
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
            onClick={() => setIsCustomRangeOpen(true)}
            className="text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Custom range...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={isCustomRangeOpen} onOpenChange={setIsCustomRangeOpen}>
        <PopoverTrigger asChild>
          <div />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700" align="end">
          <div className="p-4 space-y-4">
            <div className="text-sm font-medium text-gray-300 mb-3">Select Custom Date Range</div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-gray-700 border-gray-600 text-gray-300",
                        !customStartDate && "text-gray-500"
                      )}
                    >
                      {customStartDate ? format(customStartDate, "MMM d, yyyy") : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-gray-700 border-gray-600 text-gray-300",
                        !customEndDate && "text-gray-500"
                      )}
                    >
                      {customEndDate ? format(customEndDate, "MMM d, yyyy") : "Pick end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsCustomRangeOpen(false)}
                className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleCustomRangeApply}
                disabled={!customStartDate || !customEndDate}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Export the helper function for use in other components
export { getPresetRange };
