
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

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
    <div className="space-y-6">
      {DAYS.map((day) => {
        const dayAvailability = availability[day.key];
        const firstBlock = dayAvailability.timeBlocks[0];
        
        return (
          <div key={day.key} className="flex items-center justify-between">
            {/* Left side - Toggle and Day name */}
            <div className="flex items-center space-x-4 min-w-[160px]">
              <Switch
                checked={dayAvailability.enabled}
                onCheckedChange={(enabled) => updateDayEnabled(day.key, enabled)}
                className="scale-110"
              />
              <span className={`text-base font-medium ${
                dayAvailability.enabled 
                  ? 'text-white' 
                  : 'text-gray-400'
              }`}>
                {day.label}
              </span>
            </div>

            {/* Right side - Time inputs */}
            <div className="flex items-center space-x-4">
              {dayAvailability.enabled && firstBlock ? (
                <>
                  <Input
                    type="time"
                    value={firstBlock.startTime}
                    onChange={(e) => updateTimeBlock(day.key, firstBlock.id, 'startTime', e.target.value)}
                    className="w-24 h-10 text-sm bg-gray-800 border-gray-600 text-white text-center focus:border-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-gray-400 text-lg">-</span>
                  <Input
                    type="time"
                    value={firstBlock.endTime}
                    onChange={(e) => updateTimeBlock(day.key, firstBlock.id, 'endTime', e.target.value)}
                    className="w-24 h-10 text-sm bg-gray-800 border-gray-600 text-white text-center focus:border-teal-500 focus:ring-teal-500"
                  />
                </>
              ) : (
                <div className="w-48" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
