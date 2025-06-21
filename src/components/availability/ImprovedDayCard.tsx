
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

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
  dayOfWeek: number;
  isWeekend: boolean;
}

interface ImprovedDayCardProps {
  day: Day;
  dayAvailability: DayAvailability;
  hasPendingUpdates: boolean;
  onUpdateDayEnabled: (dayKey: string, enabled: boolean) => Promise<void>;
  onUpdateTimeBlock: (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => Promise<void>;
  onAddTimeBlock: (dayKey: string) => Promise<void>;
  onRemoveTimeBlock: (dayKey: string, blockId: string) => Promise<void>;
}

export const ImprovedDayCard: React.FC<ImprovedDayCardProps> = ({
  day,
  dayAvailability,
  hasPendingUpdates,
  onUpdateDayEnabled,
  onUpdateTimeBlock,
  onAddTimeBlock,
  onRemoveTimeBlock,
}) => {
  const handleTimeChange = (blockId: string, field: 'startTime' | 'endTime', value: string) => {
    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(value)) return;
    onUpdateTimeBlock(day.key, blockId, field, value);
  };

  return (
    <Card className={`transition-all duration-200 ${
      dayAvailability.enabled 
        ? 'bg-white border-gray-200' 
        : 'bg-gray-50 border-gray-100'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Switch
              checked={dayAvailability.enabled}
              onCheckedChange={(enabled) => onUpdateDayEnabled(day.key, enabled)}
              className="scale-110"
            />
            <div>
              <h3 className={`text-lg font-medium ${
                dayAvailability.enabled ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {day.label}
              </h3>
              {day.isWeekend && (
                <p className="text-xs text-gray-500">Weekend</p>
              )}
            </div>
          </div>
          
          {hasPendingUpdates && (
            <div className="flex items-center space-x-2 text-xs text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Opslaan...</span>
            </div>
          )}
        </div>

        {dayAvailability.enabled && (
          <div className="space-y-3 ml-8">
            {dayAvailability.timeBlocks.map((block, index) => (
              <div key={block.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Input
                    type="time"
                    value={block.startTime}
                    onChange={(e) => handleTimeChange(block.id, 'startTime', e.target.value)}
                    className="w-24 text-center bg-white border-gray-300"
                  />
                  <span className="text-gray-400">tot</span>
                  <Input
                    type="time"
                    value={block.endTime}
                    onChange={(e) => handleTimeChange(block.id, 'endTime', e.target.value)}
                    className="w-24 text-center bg-white border-gray-300"
                  />
                </div>

                <div className="flex items-center space-x-1 ml-auto">
                  {dayAvailability.timeBlocks.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveTimeBlock(day.key, block.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8"
                      title="Tijdslot verwijderen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  {index === dayAvailability.timeBlocks.length - 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAddTimeBlock(day.key)}
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 h-8 w-8"
                      title="Extra tijdslot toevoegen"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!dayAvailability.enabled && (
          <div className="ml-8 text-sm text-gray-500 italic">
            Gesloten
          </div>
        )}
      </CardContent>
    </Card>
  );
};
