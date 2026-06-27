
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Plus, Check } from 'lucide-react';
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
  const { t } = useTranslation('settings');
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
    <div className="space-y-3 border-t border-white/[0.06] pt-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[13px] font-medium leading-[18px] text-foreground">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {t('settings.services.calendarSelector.label', 'Which calendar to use')}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {t('settings.services.calendarSelector.description', 'Add this service to an existing calendar, or create a new one.')}
        </p>
      </div>

      <div className="grid gap-2" role="radiogroup" aria-label={t('settings.services.calendarSelector.ariaLabel', 'Calendar for this service')}>
        {calendars.map((calendar) => {
          const selected = selectedCalendarId === calendar.id;
          return (
            <button
              key={calendar.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => !disabled && onCalendarSelect(calendar.id)}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                selected
                  ? 'border-primary/40 bg-primary/[0.08]'
                  : 'border-white/[0.08] bg-muted/40 hover:border-white/15 hover:bg-muted/70',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10"
                  style={{ backgroundColor: calendar.color || '#6B7280' }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{calendar.name}</span>
                  {calendar.description && (
                    <span className="block truncate text-xs text-muted-foreground">{calendar.description}</span>
                  )}
                </span>
              </span>
              {selected && <Check className="h-4 w-4 shrink-0 text-accent-foreground" />}
            </button>
          );
        })}

        {/* Create New Calendar Option */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setShowCreateForm(true)}
          className={cn(
            'flex items-center gap-3 rounded-lg border border-dashed border-white/[0.12] p-3 text-left transition-colors hover:border-white/25 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <Plus className="h-4 w-4 text-muted-foreground" />
          </span>
          <span>
            <span className="block font-medium text-foreground">{t('settings.services.calendarSelector.createButton', 'Create new calendar')}</span>
            <span className="block text-xs text-muted-foreground">{t('settings.services.calendarSelector.createButtonDescription', 'Set up a new calendar with availability')}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
