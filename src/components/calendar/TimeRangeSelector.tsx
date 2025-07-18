
import { Clock } from 'lucide-react';
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
  const timeOptions = generateTimeOptions();

  const handleStartTimeChange = (newStartTime: string) => {
    onTimeRangeChange(newStartTime, endTime);
  };

  const handleEndTimeChange = (newEndTime: string) => {
    onTimeRangeChange(startTime, newEndTime);
  };

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1 border border-border/60 shadow-sm">
      <div className="flex items-center gap-1.5 px-2">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Show times:</span>
      </div>
      
      <Select value={startTime} onValueChange={handleStartTimeChange}>
        <SelectTrigger className="w-16 h-6 border-0 bg-background/50 hover:bg-background/80 focus:ring-1 focus:ring-primary/50 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {timeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-xs text-muted-foreground">to</span>

      <Select value={endTime} onValueChange={handleEndTimeChange}>
        <SelectTrigger className="w-16 h-6 border-0 bg-background/50 hover:bg-background/80 focus:ring-1 focus:ring-primary/50 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {timeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
