import React from 'react';
import { Calendar } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeBlockEditor } from './TimeBlockEditor';
import type { DayAvailability } from '@/types/availability';

interface DayConfigurationProps {
  dayKey: string;
  dayLabel: string;
  dayAvailability: DayAvailability;
  onUpdateAvailability: (dayAvailability: DayAvailability) => void;
}

export const DayConfiguration: React.FC<DayConfigurationProps> = ({
  dayKey,
  dayLabel,
  dayAvailability,
  onUpdateAvailability,
}) => {
  const handleDayToggle = (enabled: boolean) => {
    onUpdateAvailability({
      ...dayAvailability,
      enabled,
    });
  };

  const handleUpdateTimeBlock = (blockId: string, field: 'startTime' | 'endTime', value: string) => {
    const updatedTimeBlocks = dayAvailability.timeBlocks.map(block =>
      block.id === blockId ? { ...block, [field]: value } : block
    );

    onUpdateAvailability({
      ...dayAvailability,
      timeBlocks: updatedTimeBlocks,
    });
  };

  const handleAddTimeBlock = () => {
    const newBlock = {
      id: `${dayKey}-${Date.now()}`,
      startTime: '09:00',
      endTime: '17:00',
    };

    onUpdateAvailability({
      ...dayAvailability,
      timeBlocks: [...dayAvailability.timeBlocks, newBlock],
    });
  };

  const handleRemoveTimeBlock = (blockId: string) => {
    const updatedTimeBlocks = dayAvailability.timeBlocks.filter(block => block.id !== blockId);

    onUpdateAvailability({
      ...dayAvailability,
      timeBlocks: updatedTimeBlocks,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">{dayLabel}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-muted-foreground">
              {dayAvailability.enabled ? 'Available' : 'Unavailable'}
            </span>
            <Switch
              checked={dayAvailability.enabled}
              onCheckedChange={handleDayToggle}
            />
          </div>
        </div>
        <CardDescription>
          Configure your availability for {dayLabel.toLowerCase()}
        </CardDescription>
      </CardHeader>
      
      {dayAvailability.enabled && (
        <CardContent>
          <TimeBlockEditor
            dayKey={dayKey}
            timeBlocks={dayAvailability.timeBlocks}
            onUpdateTimeBlock={handleUpdateTimeBlock}
            onAddTimeBlock={handleAddTimeBlock}
            onRemoveTimeBlock={handleRemoveTimeBlock}
          />
        </CardContent>
      )}
    </Card>
  );
};