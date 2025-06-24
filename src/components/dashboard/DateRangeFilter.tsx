
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
        <DialogContent className="sm:max-w-[800px] bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 shadow-2xl">
          <DialogHeader className="space-y-4 pb-6">
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              Select Custom Date Range
            </DialogTitle>
            <p className="text-gray-400 text-sm">
              Choose your custom start and end dates for data analysis
            </p>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                <label className="text-lg font-semibold text-white">Start Date</label>
              </div>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gray-800/80 backdrop-blur border border-gray-600/50 rounded-xl overflow-hidden">
                  <CalendarComponent
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    className="pointer-events-auto p-6"
                    classNames={{
                      months: "text-white",
                      month: "space-y-6",
                      caption: "text-white font-semibold mb-4",
                      caption_label: "text-white text-xl",
                      nav_button: "text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors w-9 h-9",
                      head_cell: "text-gray-400 font-medium text-sm w-12 h-12 flex items-center justify-center",
                      row: "flex w-full mt-1",
                      cell: "relative w-12 h-12 text-center text-sm p-0 focus-within:relative focus-within:z-20",
                      day: "w-full h-full text-white hover:bg-gray-700 rounded-lg transition-colors font-medium flex items-center justify-center",
                      day_selected: "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 rounded-lg shadow-lg",
                      day_today: "bg-gray-700 text-white rounded-lg font-bold",
                      day_outside: "text-gray-500 hover:text-gray-400"
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                <label className="text-lg font-semibold text-white">End Date</label>
              </div>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gray-800/80 backdrop-blur border border-gray-600/50 rounded-xl overflow-hidden">
                  <CalendarComponent
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    className="pointer-events-auto p-6"
                    classNames={{
                      months: "text-white",
                      month: "space-y-6",
                      caption: "text-white font-semibold mb-4",
                      caption_label: "text-white text-xl",
                      nav_button: "text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors w-9 h-9",
                      head_cell: "text-gray-400 font-medium text-sm w-12 h-12 flex items-center justify-center",
                      row: "flex w-full mt-1",
                      cell: "relative w-12 h-12 text-center text-sm p-0 focus-within:relative focus-within:z-20",
                      day: "w-full h-full text-white hover:bg-gray-700 rounded-lg transition-colors font-medium flex items-center justify-center",
                      day_selected: "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 rounded-lg shadow-lg",
                      day_today: "bg-gray-700 text-white rounded-lg font-bold",
                      day_outside: "text-gray-500 hover:text-gray-400"
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Date Range Summary */}
          {customStartDate && customEndDate && (
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-4 border border-gray-600/30">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Selected Range:</span>
                <span className="text-white font-semibold">
                  {format(customStartDate, 'MMM d, yyyy')} - {format(customEndDate, 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-6 space-x-3">
            <Button 
              variant="outline" 
              onClick={() => setIsCustomDialogOpen(false)}
              className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCustomRangeApply}
              disabled={!customStartDate || !customEndDate}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
