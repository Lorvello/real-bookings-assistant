
import React from 'react';
import { DayAvailability } from './DayAvailability';

interface WeeklyScheduleTabProps {
  calendarId: string;
}

export function WeeklyScheduleTab({ calendarId }: WeeklyScheduleTabProps) {
  const weekDays = [
    { key: 'monday', label: 'Maandag' },
    { key: 'tuesday', label: 'Dinsdag' },
    { key: 'wednesday', label: 'Woensdag' },
    { key: 'thursday', label: 'Donderdag' },
    { key: 'friday', label: 'Vrijdag' },
    { key: 'saturday', label: 'Zaterdag' },
    { key: 'sunday', label: 'Zondag' }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Stel je beschikbaarheid in per dag van de week
      </div>
      
      {weekDays.map((day) => (
        <DayAvailability 
          key={day.key}
          day={day.key as any}
          label={day.label}
          calendarId={calendarId}
        />
      ))}
    </div>
  );
}
