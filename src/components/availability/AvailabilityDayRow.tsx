
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

interface AvailabilityDayRowProps {
  day: Day;
  dayAvailability: DayAvailability;
  openDropdowns: Record<string, boolean>;
  hasPendingUpdates: boolean;
  hasSyncingRules: boolean;
  onUpdateDayEnabled: (dayKey: string, enabled: boolean) => void;
  onUpdateTimeBlock: (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => void;
  onAddTimeBlock: (dayKey: string) => void;
  onRemoveTimeBlock: (dayKey: string, blockId: string) => void;
  onCopyDay?: (dayKey: string) => void;
  onToggleDropdown: (dropdownId: string) => void;
  onCloseDropdown: (dropdownId: string) => void;
}

export const AvailabilityDayRow: React.FC<AvailabilityDayRowProps> = ({
  day,
  dayAvailability,
  openDropdowns,
  hasPendingUpdates,
  hasSyncingRules,
  onUpdateDayEnabled,
  onUpdateTimeBlock,
  onAddTimeBlock,
  onRemoveTimeBlock,
  onCopyDay,
  onToggleDropdown,
  onCloseDropdown,
}) => {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-border/30 last:border-b-0">
      {/* Toggle + Day name - fixed width */}
      <div className="flex items-center gap-3 min-w-[140px]">
        <Switch
          checked={dayAvailability.enabled}
          onCheckedChange={(enabled) => onUpdateDayEnabled(day.key, enabled)}
        />
        <span className={`text-sm font-medium transition-colors duration-200 ${
          dayAvailability.enabled 
            ? 'text-foreground' 
            : 'text-muted-foreground'
        }`}>
          {day.label}
        </span>
        {(hasPendingUpdates || hasSyncingRules) && (
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        )}
      </div>
      
      {/* Time blocks column */}
      {dayAvailability.enabled ? (
        <div className="flex flex-col gap-2 flex-1">
          {dayAvailability.timeBlocks.map((block, index) => (
            <TimeBlockRow
              key={block.id}
              block={block}
              dayKey={day.key}
              canDelete={dayAvailability.timeBlocks.length > 1}
              isLastBlock={index === dayAvailability.timeBlocks.length - 1}
              isFirstBlock={index === 0}
              openDropdowns={openDropdowns}
              onUpdateTimeBlock={onUpdateTimeBlock}
              onAddTimeBlock={onAddTimeBlock}
              onRemoveTimeBlock={onRemoveTimeBlock}
              onCopyDay={onCopyDay}
              onToggleDropdown={onToggleDropdown}
              onCloseDropdown={onCloseDropdown}
            />
          ))}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">Unavailable</span>
      )}
    </div>
  );
};
