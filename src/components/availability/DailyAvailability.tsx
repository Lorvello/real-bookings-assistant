
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Copy } from 'lucide-react';

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  enabled: boolean;
  timeBlocks: TimeBlock[];
}

interface DailyAvailabilityProps {
  onChange: () => void;
}

const DAYS = [
  { key: 'monday', label: 'Monday', isWeekend: false },
  { key: 'tuesday', label: 'Tuesday', isWeekend: false },
  { key: 'wednesday', label: 'Wednesday', isWeekend: false },
  { key: 'thursday', label: 'Thursday', isWeekend: false },
  { key: 'friday', label: 'Friday', isWeekend: false },
  { key: 'saturday', label: 'Saturday', isWeekend: true },
  { key: 'sunday', label: 'Sunday', isWeekend: true }
];

export const DailyAvailability: React.FC<DailyAvailabilityProps> = ({ onChange }) => {
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>(() => {
    const initial: Record<string, DayAvailability> = {};
    DAYS.forEach(day => {
      initial[day.key] = {
        enabled: !day.isWeekend,
        timeBlocks: [{
          id: `${day.key}-1`,
          startTime: '08:00',
          endTime: '19:00'
        }]
      };
    });
    return initial;
  });

  const updateDayEnabled = (dayKey: string, enabled: boolean) => {
    setAvailability(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], enabled }
    }));
    onChange();
  };

  const addTimeBlock = (dayKey: string) => {
    const dayAvailability = availability[dayKey];
    const lastBlock = dayAvailability.timeBlocks[dayAvailability.timeBlocks.length - 1];
    
    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeBlocks: [
          ...prev[dayKey].timeBlocks,
          {
            id: `${dayKey}-${Date.now()}`,
            startTime: lastBlock ? lastBlock.endTime : '08:00',
            endTime: '19:00'
          }
        ]
      }
    }));
    onChange();
  };

  const duplicateTimeBlock = (dayKey: string, blockId: string) => {
    const block = availability[dayKey].timeBlocks.find(b => b.id === blockId);
    if (!block) return;

    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeBlocks: [
          ...prev[dayKey].timeBlocks,
          {
            id: `${dayKey}-${Date.now()}`,
            startTime: block.startTime,
            endTime: block.endTime
          }
        ]
      }
    }));
    onChange();
  };

  const updateTimeBlock = (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeBlocks: prev[dayKey].timeBlocks.map(block =>
          block.id === blockId ? { ...block, [field]: value } : block
        )
      }
    }));
    onChange();
  };

  return (
    <div className="space-y-1">
      {DAYS.map((day, index) => {
        const dayAvailability = availability[day.key];
        const firstBlock = dayAvailability.timeBlocks[0];
        
        return (
          <div key={day.key} className="flex items-center justify-between py-3 group">
            {/* Left side - Toggle and Day name */}
            <div className="flex items-center space-x-4 min-w-[140px]">
              <Switch
                checked={dayAvailability.enabled}
                onCheckedChange={(enabled) => updateDayEnabled(day.key, enabled)}
                className={`${!dayAvailability.enabled ? 'opacity-50' : ''}`}
              />
              <span className={`text-sm font-medium ${
                dayAvailability.enabled 
                  ? 'text-foreground' 
                  : 'text-muted-foreground'
              }`}>
                {day.label}
              </span>
            </div>

            {/* Center - Time inputs */}
            {dayAvailability.enabled && firstBlock && (
              <div className="flex items-center space-x-3 flex-1 max-w-[300px]">
                <Input
                  type="time"
                  value={firstBlock.startTime}
                  onChange={(e) => updateTimeBlock(day.key, firstBlock.id, 'startTime', e.target.value)}
                  className="w-20 h-8 text-xs bg-background border-border text-center"
                />
                <span className="text-muted-foreground text-sm">-</span>
                <Input
                  type="time"
                  value={firstBlock.endTime}
                  onChange={(e) => updateTimeBlock(day.key, firstBlock.id, 'endTime', e.target.value)}
                  className="w-20 h-8 text-xs bg-background border-border text-center"
                />
              </div>
            )}

            {/* Right side - Action buttons */}
            {dayAvailability.enabled && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addTimeBlock(day.key)}
                  className="h-7 w-7 p-0 hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => duplicateTimeBlock(day.key, firstBlock.id)}
                  className="h-7 w-7 p-0 hover:bg-muted"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Empty space for disabled days */}
            {!dayAvailability.enabled && <div className="flex-1" />}
          </div>
        );
      })}
    </div>
  );
};
