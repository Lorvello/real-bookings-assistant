
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';

interface Day {
  key: string;
  label: string;
  isWeekend: boolean;
  dayOfWeek: number;
}

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  enabled: boolean;
  timeBlocks: TimeBlock[];
}

interface DayRowProps {
  day: Day;
  availability: DayAvailability;
  onUpdate: (updates: Partial<DayAvailability>) => void;
  isPending: boolean;
  isSyncing: boolean;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  const time = `${hours.toString().padStart(2, '0')}:${minutes}`;
  return { value: time, label: time };
});

export const DayRow: React.FC<DayRowProps> = ({
  day,
  availability,
  onUpdate,
  isPending,
  isSyncing
}) => {
  const handleToggle = (enabled: boolean) => {
    onUpdate({ enabled });
  };

  const handleTimeChange = (blockId: string, field: 'startTime' | 'endTime', value: string) => {
    const newTimeBlocks = availability.timeBlocks.map(block =>
      block.id === blockId ? { ...block, [field]: value } : block
    );
    onUpdate({ timeBlocks: newTimeBlocks });
  };

  const handleAddTimeBlock = () => {
    const newBlock: TimeBlock = {
      id: `${day.key}-${Date.now()}`,
      startTime: '09:00',
      endTime: '17:00'
    };
    onUpdate({ timeBlocks: [...availability.timeBlocks, newBlock] });
  };

  const handleRemoveTimeBlock = (blockId: string) => {
    if (availability.timeBlocks.length > 1) {
      const newTimeBlocks = availability.timeBlocks.filter(block => block.id !== blockId);
      onUpdate({ timeBlocks: newTimeBlocks });
    }
  };

  return (
    <div className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="w-20 text-sm font-medium text-foreground">
        {day.label}
      </div>
      
      <div className="flex items-center">
        <Switch
          checked={availability.enabled}
          onCheckedChange={handleToggle}
          disabled={isPending || isSyncing}
        />
        {(isPending || isSyncing) && (
          <Loader2 className="h-3 w-3 animate-spin ml-2 text-muted-foreground" />
        )}
      </div>

      {availability.enabled && (
        <div className="flex-1 flex items-center space-x-2">
          {availability.timeBlocks.map((block, index) => (
            <div key={block.id} className="flex items-center space-x-1">
              {index > 0 && <span className="text-xs text-muted-foreground">+</span>}
              
              <Select
                value={block.startTime}
                onValueChange={(value) => handleTimeChange(block.id, 'startTime', value)}
                disabled={isPending || isSyncing}
              >
                <SelectTrigger className="w-18 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-32">
                  {TIME_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-xs text-muted-foreground">-</span>

              <Select
                value={block.endTime}
                onValueChange={(value) => handleTimeChange(block.id, 'endTime', value)}
                disabled={isPending || isSyncing}
              >
                <SelectTrigger className="w-18 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-32">
                  {TIME_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {availability.timeBlocks.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveTimeBlock(block.id)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  disabled={isPending || isSyncing}
                >
                  ×
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddTimeBlock}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
            disabled={isPending || isSyncing}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
