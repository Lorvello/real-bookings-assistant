
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
import { DateRange, DateRangePreset, getPresetRange, presetOptions } from '@/utils/dateRangePresets';

interface DateRangeFilterProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

export function DateRangeFilter({ selectedRange, onRangeChange }: DateRangeFilterProps) {
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null
  });

  const handlePresetSelect = (preset: DateRangePreset) => {
    const range = getPresetRange(preset);
    onRangeChange(range);
  };

  const openCustomDialog = () => {
    // Always start with empty values when opening custom dialog
    setTempRange({
      startDate: null,
      endDate: null
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
    // Reset to empty values for next time
    setTempRange({
      startDate: null,
      endDate: null
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
          {presetOptions.map(({ preset, label }) => (
            <DropdownMenuItem 
              key={preset}
              onClick={() => handlePresetSelect(preset)}
              className="text-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground"
            >
              {label}
            </DropdownMenuItem>
          ))}
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

// Re-export types and functions for backward compatibility
export type { DateRange, DateRangePreset };
export { getPresetRange };
