import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Clock } from 'lucide-react';

interface DayAvailability {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface AvailabilityQuickSetupProps {
  availability: Record<string, DayAvailability>;
  onChange: (availability: Record<string, DayAvailability>) => void;
}

const DAYS = [
  { key: 'monday', label: 'Mon', fullLabel: 'Monday', dayOfWeek: 1 },
  { key: 'tuesday', label: 'Tue', fullLabel: 'Tuesday', dayOfWeek: 2 },
  { key: 'wednesday', label: 'Wed', fullLabel: 'Wednesday', dayOfWeek: 3 },
  { key: 'thursday', label: 'Thu', fullLabel: 'Thursday', dayOfWeek: 4 },
  { key: 'friday', label: 'Fri', fullLabel: 'Friday', dayOfWeek: 5 },
  { key: 'saturday', label: 'Sat', fullLabel: 'Saturday', dayOfWeek: 6 },
  { key: 'sunday', label: 'Sun', fullLabel: 'Sunday', dayOfWeek: 0 },
];

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];

export const getDefaultAvailability = (): Record<string, DayAvailability> => ({
  monday: { enabled: true, startTime: '09:00', endTime: '17:00' },
  tuesday: { enabled: true, startTime: '09:00', endTime: '17:00' },
  wednesday: { enabled: true, startTime: '09:00', endTime: '17:00' },
  thursday: { enabled: true, startTime: '09:00', endTime: '17:00' },
  friday: { enabled: true, startTime: '09:00', endTime: '17:00' },
  saturday: { enabled: false, startTime: '09:00', endTime: '17:00' },
  sunday: { enabled: false, startTime: '09:00', endTime: '17:00' },
});

export function AvailabilityQuickSetup({ availability, onChange }: AvailabilityQuickSetupProps) {
  const toggleDay = (dayKey: string) => {
    onChange({
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        enabled: !availability[dayKey].enabled
      }
    });
  };

  const updateTime = (dayKey: string, field: 'startTime' | 'endTime', value: string) => {
    onChange({
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 mb-2">
        <Clock className="h-4 w-4" />
        <h4 className="font-medium text-foreground">Working Hours</h4>
      </div>
      
      <p className="text-xs text-muted-foreground mb-3">
        Set the default working hours for this calendar. You can adjust this later.
      </p>

      <div className="space-y-2 border border-border/50 rounded-lg p-3 bg-muted/20">
        {DAYS.map((day) => (
          <div key={day.key} className="flex items-center gap-3">
            <Switch
              checked={availability[day.key]?.enabled ?? false}
              onCheckedChange={() => toggleDay(day.key)}
              className="data-[state=checked]:bg-primary"
            />
            <span className="w-10 text-sm font-medium text-foreground">
              {day.label}
            </span>
            
            {availability[day.key]?.enabled ? (
              <div className="flex items-center gap-2 flex-1">
                <select
                  value={availability[day.key]?.startTime || '09:00'}
                  onChange={(e) => updateTime(day.key, 'startTime', e.target.value)}
                  className="h-8 px-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                <span className="text-muted-foreground">-</span>
                <select
                  value={availability[day.key]?.endTime || '17:00'}
                  onChange={(e) => updateTime(day.key, 'endTime', e.target.value)}
                  className="h-8 px-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Closed</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export { DAYS };
export type { DayAvailability };
