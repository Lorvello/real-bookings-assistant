
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
  const [currentStep, setCurrentStep] = useState<'start' | 'end'>('start');

  const handlePresetSelect = (preset: DateRangePreset) => {
    const range = getPresetRange(preset);
    onRangeChange(range);
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setCustomStartDate(date);
    setCustomEndDate(undefined); // Reset end date when start date changes
    setCurrentStep('end'); // Move to end date selection
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
    setIsCustomDialogOpen(true);
  };

  const resetSelection = () => {
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setCurrentStep('start');
  };

  const goBackToStartDate = () => {
    setCurrentStep('start');
    setCustomEndDate(undefined);
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
          
          {/* Two-step progress indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              {/* Step 1: Start Date */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                currentStep === 'start' 
                  ? 'bg-primary text-primary-foreground' 
                  : customStartDate 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-muted text-muted-foreground'
              }`}>
                <span className="text-sm font-medium">1. Start Date</span>
                {customStartDate && (
                  <span className="text-xs bg-background/20 px-2 py-1 rounded">
                    {format(customStartDate, 'MMM d')}
                  </span>
                )}
              </div>

              {/* Connector */}
              <div className="w-8 h-px bg-border"></div>

              {/* Step 2: End Date */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                currentStep === 'end' 
                  ? 'bg-primary text-primary-foreground' 
                  : customEndDate 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-muted text-muted-foreground'
              }`}>
                <span className="text-sm font-medium">2. End Date</span>
                {customEndDate && (
                  <span className="text-xs bg-background/20 px-2 py-1 rounded">
                    {format(customEndDate, 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <p className="text-center text-sm text-muted-foreground mb-4">
            {currentStep === 'start' 
              ? "Choose your start date" 
              : "Choose your end date (must be after start date)"}
          </p>

          {/* Calendar */}
          <div className="flex justify-center">
            {currentStep === 'start' ? (
              <CalendarComponent
                mode="single"
                selected={customStartDate}
                onSelect={handleStartDateSelect}
                className="pointer-events-auto"
                disabled={(date) => date > new Date()}
              />
            ) : (
              <CalendarComponent
                mode="single"
                selected={customEndDate}
                onSelect={handleEndDateSelect}
                className="pointer-events-auto"
                disabled={(date) => {
                  if (!customStartDate) return true;
                  return date < customStartDate || date > new Date();
                }}
              />
            )}
          </div>

          {/* Selected range summary */}
          {customStartDate && customEndDate && (
            <div className="bg-muted/50 rounded-lg p-4 mt-4 border border-border/50">
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Selected Range
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {format(customStartDate, 'MMM d, yyyy')} - {format(customEndDate, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            {currentStep === 'end' && (
              <Button 
                variant="outline" 
                onClick={goBackToStartDate}
                size="sm"
                className="w-full sm:w-auto"
              >
                ← Back to Start Date
              </Button>
            )}
            
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
