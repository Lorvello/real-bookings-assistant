
import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { CustomRangeCalendar } from './CustomRangeCalendar';

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
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: selectedRange.startDate,
    endDate: selectedRange.endDate
  });

  const handlePresetSelect = (preset: DateRangePreset) => {
    const range = getPresetRange(preset);
    onRangeChange(range);
  };

  const openCustomDialog = () => {
    setTempRange({
      startDate: selectedRange.startDate,
      endDate: selectedRange.endDate
    });
    setIsCustomDialogOpen(true);
  };

  const handleApply = () => {
    if (tempRange.startDate && tempRange.endDate) {
      const range: DateRange = {
        startDate: tempRange.startDate,
        endDate: tempRange.endDate,
        preset: 'custom',
        label: `${format(tempRange.startDate, 'MMM d')} - ${format(tempRange.endDate, 'MMM d, yyyy')}`
      };
      onRangeChange(range);
      setIsCustomDialogOpen(false);
    }
  };

  const handleClear = () => {
    setTempRange({ startDate: null, endDate: null });
  };

  const handleCancel = () => {
    setIsCustomDialogOpen(false);
    setTempRange({
      startDate: selectedRange.startDate,
      endDate: selectedRange.endDate
    });
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
        <DialogContent className="max-w-md p-0 bg-card border-border">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-xl font-semibold text-foreground">
              Select Date Range
            </DialogTitle>
          </DialogHeader>
          
          <CustomRangeCalendar
            value={tempRange}
            onChange={setTempRange}
            onApply={handleApply}
            onClear={handleClear}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Export the helper function for use in other components
export { getPresetRange };
