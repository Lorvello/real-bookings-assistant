import React from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DayConfiguration } from './DayConfiguration';
import { DAYS_OF_WEEK } from '@/types/availability';
import type { WeeklySchedule as WeeklyScheduleType } from '@/types/availability';
import { useAvailabilityManager } from '@/hooks/availability/useAvailabilityManager';

interface WeeklyScheduleComponentProps {
  weeklySchedule: WeeklyScheduleType;
  onSave?: () => void;
  readOnly?: boolean;
}

export const WeeklySchedule: React.FC<WeeklyScheduleComponentProps> = ({
  weeklySchedule,
  onSave,
  readOnly = false,
}) => {
  const { saving, saveWeeklySchedule, updateDayAvailability } = useAvailabilityManager();

  const handleSave = async () => {
    const success = await saveWeeklySchedule();
    if (success && onSave) {
      onSave();
    }
  };

  const resetToDefaults = () => {
    DAYS_OF_WEEK.forEach(day => {
      updateDayAvailability(day.key, {
        enabled: !day.isWeekend,
        timeBlocks: [{
          id: `${day.key}-1`,
          startTime: '09:00',
          endTime: '17:00',
        }],
      });
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>
                Configure your availability for each day of the week
              </CardDescription>
            </div>
            {!readOnly && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={resetToDefaults}
                  disabled={saving}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Schedule'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:gap-6">
        {DAYS_OF_WEEK.map(day => (
          <DayConfiguration
            key={day.key}
            dayKey={day.key}
            dayLabel={day.label}
            dayAvailability={weeklySchedule[day.key]}
            onUpdateAvailability={(dayAvailability) => 
              updateDayAvailability(day.key, dayAvailability)
            }
          />
        ))}
      </div>
    </div>
  );
};