
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TimeRangeSelectorProps {
  startTime: string;
  endTime: string;
  onTimeRangeChange: (startTime: string, endTime: string) => void;
}

// Generate time options in 30-minute intervals
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = hour === 0 && minute === 0 ? '00:00' : timeString;
      options.push({ value: timeString, label: displayTime });
    }
  }
  return options;
};

export function TimeRangeSelector({ startTime, endTime, onTimeRangeChange }: TimeRangeSelectorProps) {
  const { t } = useTranslation('appPages');
  const timeOptions = generateTimeOptions();

  const handleStartTimeChange = (newStartTime: string) => {
    onTimeRangeChange(newStartTime, endTime);
  };

  const handleEndTimeChange = (newEndTime: string) => {
    onTimeRangeChange(startTime, newEndTime);
  };

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-muted/40 p-1">
      <div className="flex items-center gap-1.5 pl-2 pr-1">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="hidden text-xs font-medium text-muted-foreground sm:inline">{t('calPage.timeRange.label', 'Show times:')}</span>
      </div>

      <Select value={startTime} onValueChange={handleStartTimeChange}>
        <SelectTrigger aria-label={t('calPage.timeRange.startAriaLabel', 'Start of visible time range')} className="h-7 w-[4.75rem] border-0 bg-background/50 px-2 text-xs tabular-nums hover:bg-background/80 focus:ring-1 focus:ring-primary/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {timeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs tabular-nums">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-xs text-muted-foreground">{t('calPage.timeRange.separator', 'to')}</span>

      <Select value={endTime} onValueChange={handleEndTimeChange}>
        <SelectTrigger aria-label={t('calPage.timeRange.endAriaLabel', 'End of visible time range')} className="h-7 w-[4.75rem] border-0 bg-background/50 px-2 text-xs tabular-nums hover:bg-background/80 focus:ring-1 focus:ring-primary/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {timeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs tabular-nums">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
