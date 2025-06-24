
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
        <DialogContent className="sm:max-w-[600px] bg-background border border-border shadow-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold text-foreground text-center">
              Select Custom Date Range
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8 py-2">
            <div className="space-y-4">
              <label className="text-sm font-medium text-muted-foreground block text-center">
                Start Date
              </label>
              <div className="flex justify-center">
                <div className="bg-card rounded-lg border border-border shadow-sm p-4">
                  <CalendarComponent
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    className={cn(
                      "p-0 pointer-events-auto",
                      "[&_.rdp-months]:flex [&_.rdp-months]:flex-col [&_.rdp-months]:gap-4",
                      "[&_.rdp-month]:space-y-4",
                      "[&_.rdp-caption]:flex [&_.rdp-caption]:justify-center [&_.rdp-caption]:pt-1 [&_.rdp-caption]:relative [&_.rdp-caption]:items-center",
                      "[&_.rdp-caption_label]:text-base [&_.rdp-caption_label]:font-semibold [&_.rdp-caption_label]:text-foreground",
                      "[&_.rdp-nav]:space-x-1 [&_.rdp-nav]:flex [&_.rdp-nav]:items-center",
                      "[&_.rdp-nav_button]:h-8 [&_.rdp-nav_button]:w-8 [&_.rdp-nav_button]:bg-transparent [&_.rdp-nav_button]:p-0 [&_.rdp-nav_button]:opacity-70 [&_.rdp-nav_button]:hover:opacity-100 [&_.rdp-nav_button]:hover:bg-muted [&_.rdp-nav_button]:rounded-md [&_.rdp-nav_button]:transition-all [&_.rdp-nav_button]:border [&_.rdp-nav_button]:border-border",
                      "[&_.rdp-nav_button_previous]:absolute [&_.rdp-nav_button_previous]:left-1",
                      "[&_.rdp-nav_button_next]:absolute [&_.rdp-nav_button_next]:right-1",
                      "[&_.rdp-table]:w-full [&_.rdp-table]:border-collapse [&_.rdp-table]:space-y-1",
                      "[&_.rdp-head_row]:flex [&_.rdp-head_row]:mb-2",
                      "[&_.rdp-head_cell]:text-muted-foreground [&_.rdp-head_cell]:rounded-md [&_.rdp-head_cell]:w-10 [&_.rdp-head_cell]:font-medium [&_.rdp-head_cell]:text-[0.8rem] [&_.rdp-head_cell]:text-center [&_.rdp-head_cell]:py-2",
                      "[&_.rdp-row]:flex [&_.rdp-row]:w-full [&_.rdp-row]:mt-2",
                      "[&_.rdp-cell]:h-10 [&_.rdp-cell]:w-10 [&_.rdp-cell]:text-center [&_.rdp-cell]:text-sm [&_.rdp-cell]:p-0 [&_.rdp-cell]:relative",
                      "[&_.rdp-button]:h-10 [&_.rdp-button]:w-10 [&_.rdp-button]:p-0 [&_.rdp-button]:font-normal [&_.rdp-button]:text-foreground [&_.rdp-button]:hover:bg-accent [&_.rdp-button]:hover:text-accent-foreground [&_.rdp-button]:rounded-md [&_.rdp-button]:transition-all [&_.rdp-button]:border [&_.rdp-button]:border-transparent [&_.rdp-button]:hover:border-border",
                      "[&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-primary-foreground [&_.rdp-day_selected]:hover:bg-primary [&_.rdp-day_selected]:hover:text-primary-foreground [&_.rdp-day_selected]:focus:bg-primary [&_.rdp-day_selected]:focus:text-primary-foreground [&_.rdp-day_selected]:border-primary",
                      "[&_.rdp-day_today]:bg-accent [&_.rdp-day_today]:text-accent-foreground [&_.rdp-day_today]:font-semibold",
                      "[&_.rdp-day_outside]:text-muted-foreground [&_.rdp-day_outside]:opacity-50",
                      "[&_.rdp-day_disabled]:text-muted-foreground [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed",
                      "[&_.rdp-day_hidden]:invisible"
                    )}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-sm font-medium text-muted-foreground block text-center">
                End Date
              </label>
              <div className="flex justify-center">
                <div className="bg-card rounded-lg border border-border shadow-sm p-4">
                  <CalendarComponent
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    className={cn(
                      "p-0 pointer-events-auto",
                      "[&_.rdp-months]:flex [&_.rdp-months]:flex-col [&_.rdp-months]:gap-4",
                      "[&_.rdp-month]:space-y-4",
                      "[&_.rdp-caption]:flex [&_.rdp-caption]:justify-center [&_.rdp-caption]:pt-1 [&_.rdp-caption]:relative [&_.rdp-caption]:items-center",
                      "[&_.rdp-caption_label]:text-base [&_.rdp-caption_label]:font-semibold [&_.rdp-caption_label]:text-foreground",
                      "[&_.rdp-nav]:space-x-1 [&_.rdp-nav]:flex [&_.rdp-nav]:items-center",
                      "[&_.rdp-nav_button]:h-8 [&_.rdp-nav_button]:w-8 [&_.rdp-nav_button]:bg-transparent [&_.rdp-nav_button]:p-0 [&_.rdp-nav_button]:opacity-70 [&_.rdp-nav_button]:hover:opacity-100 [&_.rdp-nav_button]:hover:bg-muted [&_.rdp-nav_button]:rounded-md [&_.rdp-nav_button]:transition-all [&_.rdp-nav_button]:border [&_.rdp-nav_button]:border-border",
                      "[&_.rdp-nav_button_previous]:absolute [&_.rdp-nav_button_previous]:left-1",
                      "[&_.rdp-nav_button_next]:absolute [&_.rdp-nav_button_next]:right-1",
                      "[&_.rdp-table]:w-full [&_.rdp-table]:border-collapse [&_.rdp-table]:space-y-1",
                      "[&_.rdp-head_row]:flex [&_.rdp-head_row]:mb-2",
                      "[&_.rdp-head_cell]:text-muted-foreground [&_.rdp-head_cell]:rounded-md [&_.rdp-head_cell]:w-10 [&_.rdp-head_cell]:font-medium [&_.rdp-head_cell]:text-[0.8rem] [&_.rdp-head_cell]:text-center [&_.rdp-head_cell]:py-2",
                      "[&_.rdp-row]:flex [&_.rdp-row]:w-full [&_.rdp-row]:mt-2",
                      "[&_.rdp-cell]:h-10 [&_.rdp-cell]:w-10 [&_.rdp-cell]:text-center [&_.rdp-cell]:text-sm [&_.rdp-cell]:p-0 [&_.rdp-cell]:relative",
                      "[&_.rdp-button]:h-10 [&_.rdp-button]:w-10 [&_.rdp-button]:p-0 [&_.rdp-button]:font-normal [&_.rdp-button]:text-foreground [&_.rdp-button]:hover:bg-accent [&_.rdp-button]:hover:text-accent-foreground [&_.rdp-button]:rounded-md [&_.rdp-button]:transition-all [&_.rdp-button]:border [&_.rdp-button]:border-transparent [&_.rdp-button]:hover:border-border",
                      "[&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-primary-foreground [&_.rdp-day_selected]:hover:bg-primary [&_.rdp-day_selected]:hover:text-primary-foreground [&_.rdp-day_selected]:focus:bg-primary [&_.rdp-day_selected]:focus:text-primary-foreground [&_.rdp-day_selected]:border-primary",
                      "[&_.rdp-day_today]:bg-accent [&_.rdp-day_today]:text-accent-foreground [&_.rdp-day_today]:font-semibold",
                      "[&_.rdp-day_outside]:text-muted-foreground [&_.rdp-day_outside]:opacity-50",
                      "[&_.rdp-day_disabled]:text-muted-foreground [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed",
                      "[&_.rdp-day_hidden]:invisible"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Date Range Summary */}
            {customStartDate && customEndDate && (
              <div className="bg-card rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm font-medium">Selected Range:</span>
                  <span className="text-foreground font-semibold">
                    {format(customStartDate, 'MMM d, yyyy')} - {format(customEndDate, 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsCustomDialogOpen(false)}
              className="bg-card border-border text-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCustomRangeApply}
              disabled={!customStartDate || !customEndDate}
              className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
