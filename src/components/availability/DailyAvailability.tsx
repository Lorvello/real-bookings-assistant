
import React from 'react';
import { Clock } from 'lucide-react';
import { useDailyAvailabilityManager } from '@/hooks/useDailyAvailabilityManager';
import { DayRow } from './DayRow';

interface DailyAvailabilityProps {
  onChange: () => void;
}

export const DailyAvailability: React.FC<DailyAvailabilityProps> = ({ onChange }) => {
  const {
    DAYS,
    availability,
    setAvailability,
    pendingUpdates,
    syncingRules,
    defaultCalendar,
    defaultSchedule,
    syncToDatabase
  } = useDailyAvailabilityManager(onChange);

  if (!defaultCalendar || !defaultSchedule) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="text-center text-gray-400">
          <p>No calendar or schedule found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 bg-primary/20 rounded-xl">
          <Clock className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-base font-medium text-foreground">Working Hours</h3>
      </div>
      
      <div className="space-y-2">
        {DAYS.map((day) => (
          <DayRow
            key={day.key}
            day={day}
            availability={availability[day.key]}
            onUpdate={(updates) => {
              const newAvailability = { ...availability };
              newAvailability[day.key] = { ...newAvailability[day.key], ...updates };
              setAvailability(newAvailability);
              syncToDatabase(day.key, newAvailability[day.key]);
            }}
            isPending={Array.from(pendingUpdates).some(id => id.includes(day.key))}
            isSyncing={syncingRules.has(`${defaultSchedule.id}-${day.dayOfWeek}`)}
          />
        ))}
      </div>
    </div>
  );
};
