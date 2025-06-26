
import React from 'react';
import { Clock } from 'lucide-react';
import { AvailabilityRule } from '@/types/database';
import { DayScheduleRow } from './availability/DayScheduleRow';
import { QuickActions } from './availability/QuickActions';

interface WeekScheduleViewProps {
  calendarId: string;
  scheduleId: string;
  rules: AvailabilityRule[];
  onRuleUpdate: (id: string, updates: Partial<AvailabilityRule>) => Promise<void>;
  onRuleCreate: (rule: Partial<AvailabilityRule>) => Promise<void>;
  onRuleDelete: (id: string) => Promise<void>;
  loading: boolean;
}

const DAYS_OF_WEEK = [
  { key: 1, label: 'Maandag', short: 'Ma' },
  { key: 2, label: 'Dinsdag', short: 'Di' },
  { key: 3, label: 'Woensdag', short: 'Wo' },
  { key: 4, label: 'Donderdag', short: 'Do' },
  { key: 5, label: 'Vrijdag', short: 'Vr' },
  { key: 6, label: 'Zaterdag', short: 'Za' },
  { key: 7, label: 'Zondag', short: 'Zo' },
];

// Helper function to format time to HH:MM
const formatTimeToHHMM = (timeString: string): string => {
  if (!timeString) return '09:00';
  if (timeString.match(/^\d{2}:\d{2}$/)) return timeString;
  if (timeString.match(/^\d{2}:\d{2}:\d{2}$/)) return timeString.substring(0, 5);
  return timeString;
};

export function WeekScheduleView({
  scheduleId,
  rules,
  onRuleUpdate,
  onRuleCreate,
  onRuleDelete,
  loading
}: WeekScheduleViewProps) {
  const getRuleForDay = (dayOfWeek: number) => {
    return rules.find(rule => rule.day_of_week === dayOfWeek);
  };

  const handleToggleDay = async (dayOfWeek: number, isAvailable: boolean) => {
    const existingRule = getRuleForDay(dayOfWeek);
    
    if (existingRule) {
      await onRuleUpdate(existingRule.id, { is_available: isAvailable });
    } else {
      await onRuleCreate({
        day_of_week: dayOfWeek,
        start_time: '09:00',
        end_time: '17:00',
        is_available: isAvailable
      });
    }
  };

  const handleTimeUpdate = async (dayOfWeek: number, startTime: string, endTime: string) => {
    const existingRule = getRuleForDay(dayOfWeek);
    
    // Ensure times are in HH:MM format
    const formattedStartTime = formatTimeToHHMM(startTime);
    const formattedEndTime = formatTimeToHHMM(endTime);
    
    if (existingRule) {
      await onRuleUpdate(existingRule.id, { 
        start_time: formattedStartTime, 
        end_time: formattedEndTime 
      });
    } else {
      await onRuleCreate({
        day_of_week: dayOfWeek,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        is_available: true
      });
    }
  };

  const handleCopyDay = (fromDay: number, toDay: number) => {
    const sourceRule = getRuleForDay(fromDay);
    if (!sourceRule) return;

    handleTimeUpdate(toDay, sourceRule.start_time, sourceRule.end_time);
    handleToggleDay(toDay, sourceRule.is_available);
  };

  const handleWeekdaySchedule = () => {
    DAYS_OF_WEEK.slice(0, 5).forEach(day => {
      handleToggleDay(day.key, true);
      handleTimeUpdate(day.key, '09:00', '17:00');
    });
  };

  const handleFullWeekSchedule = () => {
    DAYS_OF_WEEK.forEach(day => {
      handleToggleDay(day.key, true);
      handleTimeUpdate(day.key, '08:00', '18:00');
    });
  };

  const handleCloseAllDays = () => {
    DAYS_OF_WEEK.forEach(day => {
      handleToggleDay(day.key, false);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 bg-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-background-secondary rounded-lg p-4 border border-border">
        <h3 className="text-base font-medium text-foreground mb-4 flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          Werkuren per dag
        </h3>

        <div className="space-y-2">
          {DAYS_OF_WEEK.map((day) => {
            const rule = getRuleForDay(day.key);

            return (
              <DayScheduleRow
                key={day.key}
                day={day}
                rule={rule}
                onToggleDay={handleToggleDay}
                onTimeUpdate={handleTimeUpdate}
                onCopyDay={handleCopyDay}
                onDeleteRule={onRuleDelete}
              />
            );
          })}
        </div>

        <QuickActions
          onWeekdaySchedule={handleWeekdaySchedule}
          onFullWeekSchedule={handleFullWeekSchedule}
          onCloseAllDays={handleCloseAllDays}
        />
      </div>
    </div>
  );
}
