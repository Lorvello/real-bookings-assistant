
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
  onUpdateDayEnabled: (dayKey: string, enabled: boolean) => Promise<void>;
  onUpdateTimeBlock: (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => Promise<void>;
  onAddTimeBlock: (dayKey: string) => Promise<void>;
  onRemoveTimeBlock: (dayKey: string, blockId: string) => Promise<void>;
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
  onToggleDropdown,
  onCloseDropdown,
}) => {
  return (
    <div className="relative">
      {(hasPendingUpdates || hasSyncingRules) && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse z-10 shadow-lg" />
      )}
      
      <div className="space-y-4">
        {/* Day header with toggle and name */}
        <div className="flex items-center justify-between p-4 bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl hover:bg-card/80 hover:border-border/60 transition-all duration-200">
          <div className="flex items-center space-x-4">
            <Switch
              checked={dayAvailability.enabled}
              onCheckedChange={(enabled) => onUpdateDayEnabled(day.key, enabled)}
              className="scale-110"
            />
            <div className="flex flex-col">
              <span className={`text-base font-semibold transition-colors duration-200 ${
                dayAvailability.enabled 
                  ? 'text-foreground' 
                  : 'text-muted-foreground'
              }`}>
                {day.label}
              </span>
              {dayAvailability.enabled && dayAvailability.timeBlocks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {dayAvailability.timeBlocks.length} time slot{dayAvailability.timeBlocks.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          {dayAvailability.enabled && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-xs text-primary font-medium">Active</span>
            </div>
          )}
        </div>

        {/* Time blocks */}
        {dayAvailability.enabled && (
          <div className="space-y-3 ml-4">
            {dayAvailability.timeBlocks.map((block, index) => (
              <TimeBlockRow
                key={block.id}
                block={block}
                dayKey={day.key}
                canDelete={dayAvailability.timeBlocks.length > 1}
                isLastBlock={index === dayAvailability.timeBlocks.length - 1}
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
    </div>
  );
};
