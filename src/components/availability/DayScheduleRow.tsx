
import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  GripVertical,
  Copy
} from 'lucide-react';
import { AvailabilityRule } from '@/types/database';

interface DayScheduleRowProps {
  day: { key: number; label: string; short: string };
  rule?: AvailabilityRule;
  onToggleDay: (dayOfWeek: number, isAvailable: boolean) => Promise<void>;
  onTimeUpdate: (dayOfWeek: number, startTime: string, endTime: string) => Promise<void>;
  onCopyDay: (fromDay: number, toDay: number) => void;
  onDeleteRule: (id: string) => Promise<void>;
}

// Helper function to format time to HH:MM
const formatTimeToHHMM = (timeString: string): string => {
  if (!timeString) return '09:00';
  if (timeString.match(/^\d{2}:\d{2}$/)) return timeString;
  if (timeString.match(/^\d{2}:\d{2}:\d{2}$/)) return timeString.substring(0, 5);
  return timeString;
};

export function DayScheduleRow({
  day,
  rule,
  onToggleDay,
  onTimeUpdate,
  onCopyDay,
  onDeleteRule
}: DayScheduleRowProps) {
  const isAvailable = rule?.is_available || false;
  const startTime = formatTimeToHHMM(rule?.start_time || '09:00');
  const endTime = formatTimeToHHMM(rule?.end_time || '17:00');

  const handleCopyToNextDay = () => {
    const nextDayKey = day.key === 0 ? 1 : (day.key + 1) % 7;
    onCopyDay(day.key, nextDayKey);
  };

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
        isAvailable 
          ? 'bg-card border-primary/20 hover:border-primary/40' 
          : 'bg-muted border-border hover:border-border'
      }`}
    >
      {/* Day Label & Toggle */}
      <div className="flex items-center space-x-4 min-w-0 flex-1">
        <div className="flex items-center space-x-3">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
          <div className="min-w-0">
            <div className="font-medium text-foreground">{day.label}</div>
            <div className="text-sm text-muted-foreground">{day.short}</div>
          </div>
        </div>

        <Switch
          checked={isAvailable}
          onCheckedChange={(checked) => onToggleDay(day.key, checked)}
          className="data-[state=checked]:bg-primary"
        />

        {isAvailable && (
          <Badge variant="default" className="bg-primary/10 text-primary">
            Available
          </Badge>
        )}
      </div>

      {/* Time Controls */}
      {isAvailable && (
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label className="text-sm text-muted-foreground">From:</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => onTimeUpdate(day.key, e.target.value, endTime)}
              className="w-24 bg-input border-border"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Label className="text-sm text-muted-foreground">To:</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => onTimeUpdate(day.key, startTime, e.target.value)}
              className="w-24 bg-input border-border"
            />
          </div>

          {/* Copy Day Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyToNextDay}
            className="p-2"
            title="Copy to next day"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Delete Rule */}
      {rule && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeleteRule(rule.id)}
          className="p-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
