
import React, { useMemo } from 'react';
import { format, setDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { dateFnsLocale } from '@/lib/dateLocale';
import { DayAvailability } from './DayAvailability';

interface WeeklyScheduleTabProps {
  calendarId: string;
  scheduleId?: string;
  rules: any[];
  loading: boolean;
}

export function WeeklyScheduleTab({
  calendarId,
  scheduleId,
  rules,
  loading
}: WeeklyScheduleTabProps) {
  const { i18n } = useTranslation('appPages');

  // Sunday-first weekday names (index = day_of_week, 0 = Sunday) localized via the
  // active date-fns locale. EN stays 'Sunday'..'Saturday'; NL becomes
  // 'zondag'..'zaterdag'. The index is the data (day_of_week); only the label
  // text is localized.
  const dayNames = useMemo(() => {
    const locale = dateFnsLocale(i18n.language);
    const reference = new Date(2024, 0, 7); // a Sunday
    return Array.from({ length: 7 }, (_, i) => format(setDay(reference, i), 'EEEE', { locale }));
  }, [i18n.language]);

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
          <h3 className="text-sm font-medium text-foreground">Work Schedule</h3>
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
