
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { enUS, nl } from 'date-fns/locale';
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

type TFn = (key: string, defaultValue: string) => string;

// Display label for a date range. The `preset` is a stable sentinel; only the
// shown label is localized (the EN defaults stay byte-identical, the
// dateRangePresets.ts util keeps its stable English `label` for logic/fallback).
// For a custom range the formatted date label is already display-ready, kept as-is.
export const presetLabel = (preset: DateRangePreset, fallback: string, t: TFn): string => {
  switch (preset) {
    case 'upcoming': return t('dashboard.dateRange.preset.upcoming', 'Upcoming');
    case 'next30days': return t('dashboard.dateRange.preset.next30days', 'Next 30 days');
    case 'last7days': return t('dashboard.dateRange.preset.last7days', 'Last 7 days');
    case 'last30days': return t('dashboard.dateRange.preset.last30days', 'Last 30 days');
    case 'last3months': return t('dashboard.dateRange.preset.last3months', 'Last 3 months');
    case 'lastyear': return t('dashboard.dateRange.preset.lastyear', 'Last year');
    case 'alltime': return t('dashboard.dateRange.preset.alltime', 'All time');
    default: return fallback;
  }
};

export const rangeLabel = (range: DateRange, t: TFn): string =>
  range.preset === 'custom' ? range.label : presetLabel(range.preset, range.label, t);

export function DateRangeFilter({ selectedRange, onRangeChange }: DateRangeFilterProps) {
  const { t, i18n } = useTranslation('dashboard');
  const dateLocale = i18n.language === 'nl' ? nl : enUS;
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
        label: `${format(tempRange.startDate, 'MMM d', { locale: dateLocale })} - ${format(tempRange.endDate, 'MMM d, yyyy', { locale: dateLocale })}`
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
            aria-label={t('dashboard.aria.filterDateRange', 'Filter by date range')}
            className="bg-card border-border text-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {rangeLabel(selectedRange, t)}
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
              {presetLabel(preset, label, t)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem 
            onClick={openCustomDialog}
            className="text-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground"
          >
            {t('dashboard.dateRange.customRange', 'Custom range...')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogContent className="max-w-md p-0 bg-card border-border">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-xl font-semibold text-foreground">
              {t('dashboard.dateRange.selectTitle', 'Select Date Range')}
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
