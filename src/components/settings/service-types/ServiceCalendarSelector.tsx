
import React, { useState } from 'react';
import { Calendar, Plus, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Calendar as CalendarType } from '@/types/database';
import { InlineCalendarCreation } from './InlineCalendarCreation';

interface ServiceCalendarSelectorProps {
  calendars: CalendarType[];
  selectedCalendarId: string | null;
  onCalendarSelect: (calendarId: string) => void;
  onCalendarCreated: (calendar: CalendarType) => void;
  disabled?: boolean;
}

export function ServiceCalendarSelector({
  calendars,
  selectedCalendarId,
  onCalendarSelect,
  onCalendarCreated,
  disabled = false
}: ServiceCalendarSelectorProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCalendarCreated = (calendar: CalendarType) => {
    onCalendarCreated(calendar);
    onCalendarSelect(calendar.id);
    setShowCreateForm(false);
  };

  if (showCreateForm) {
    return (
      <InlineCalendarCreation
        onCalendarCreated={handleCalendarCreated}
        onCancel={() => setShowCreateForm(false)}
      />
    );
  }

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-medium text-foreground">Which calendar to use</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Select a calendar to add this service to, or create a new one.
      </p>

      <div className="grid gap-2">
        {calendars.map((calendar) => (
          <Card
            key={calendar.id}
            onClick={() => !disabled && onCalendarSelect(calendar.id)}
            className={cn(
              "p-3 cursor-pointer transition-all border",
              selectedCalendarId === calendar.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full border border-border"
                  style={{ backgroundColor: calendar.color || '#6B7280' }}
                />
                <div>
                  <p className="font-medium text-foreground">{calendar.name}</p>
                  {calendar.description && (
                    <p className="text-xs text-muted-foreground">{calendar.description}</p>
                  )}
                </div>
              </div>
              {selectedCalendarId === calendar.id && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </div>
          </Card>
        ))}

        {/* Create New Calendar Option */}
        <Card
          onClick={() => !disabled && setShowCreateForm(true)}
          className={cn(
            "p-3 cursor-pointer transition-all border border-dashed border-border hover:border-primary/50 hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Create new calendar</p>
              <p className="text-xs text-muted-foreground">Set up a new calendar with availability</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
