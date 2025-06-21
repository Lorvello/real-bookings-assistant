
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { TimeBlockRow } from './TimeBlockRow';

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  enabled: boolean;
  timeBlocks: TimeBlock[];
}

interface Day {
  key: string;
  label: string;
  isWeekend: boolean;
  dayOfWeek: number;
}

interface DayRowProps {
  day: Day;
  dayAvailability: DayAvailability;
  openDropdowns: Record<string, boolean>;
  onUpdateDayEnabled: (dayKey: string, enabled: boolean) => void;
  onUpdateTimeBlock: (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => void;
  onAddTimeBlock: (dayKey: string) => void;
  onRemoveTimeBlock: (dayKey: string, blockId: string) => void;
  onToggleDropdown: (dropdownId: string) => void;
  onCloseDropdown: (dropdownId: string) => void;
}

export const DayRow: React.FC<DayRowProps> = ({
  day,
  dayAvailability,
  openDropdowns,
  onUpdateDayEnabled,
  onUpdateTimeBlock,
  onAddTimeBlock,
  onRemoveTimeBlock,
  onToggleDropdown,
  onCloseDropdown,
}) => {
  return (
    <div className="space-y-3">
      {/* Day header with toggle and name */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 min-w-[160px]">
          <Switch
            checked={dayAvailability.enabled}
            onCheckedChange={(enabled) => onUpdateDayEnabled(day.key, enabled)}
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
      </div>

      {/* Time blocks */}
      {dayAvailability.enabled && (
        <div className="space-y-2 ml-12">
          {dayAvailability.timeBlocks.map((block) => (
            <TimeBlockRow
              key={block.id}
              block={block}
              dayKey={day.key}
              canDelete={dayAvailability.timeBlocks.length > 1}
              openDropdowns={openDropdowns}
              onUpdateTimeBlock={onUpdateTimeBlock}
              onAddTimeBlock={onAddTimeBlock}
              onRemoveTimeBlock={onRemoveTimeBlock}
              onToggleDropdown={onToggleDropdown}
              onCloseDropdown={onCloseDropdown}
            />
          ))}
        </div>
      )}
    </div>
  );
};
