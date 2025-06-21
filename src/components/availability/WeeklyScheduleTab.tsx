
import React from 'react';
import { Settings } from 'lucide-react';
import { DayAvailability } from './DayAvailability';

interface WeeklyScheduleTabProps {
  calendarId: string;
  scheduleId?: string;
  rules: any[];
  loading: boolean;
}

const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

export function WeeklyScheduleTab({ 
  calendarId, 
  scheduleId, 
  rules, 
  loading 
}: WeeklyScheduleTabProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {dayNames.map((day, index) => (
          <div key={day} className="flex items-center space-x-3">
            <div className="w-20 h-4 bg-muted rounded animate-pulse"></div>
            <div className="w-8 h-5 bg-muted rounded-full animate-pulse"></div>
            <div className="w-16 h-6 bg-muted rounded animate-pulse"></div>
            <div className="w-16 h-6 bg-muted rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground">Werkschema</h3>
          <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            <Settings className="h-3 w-3" />
            Template
          </button>
        </div>
        
        <div className="space-y-3">
          {dayNames.map((day, index) => {
            const dayRule = rules.find(rule => rule.day_of_week === index);
            return (
              <DayAvailability
                key={day}
                day={day}
                dayIndex={index}
                scheduleId={scheduleId}
                initialRule={dayRule}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
