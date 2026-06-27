
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SettingsField } from '@/components/settings/SettingsField';
import { ColorPicker } from './ColorPicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar as CalendarType } from '@/types/database';

interface InlineCalendarCreationProps {
  onCalendarCreated: (calendar: CalendarType) => void;
  onCancel: () => void;
}

interface DayAvailability {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

type WeekAvailability = {
  [key: number]: DayAvailability;
};

const DAYS = [
  { key: 1, label: 'Monday' },
  { key: 2, label: 'Tuesday' },
  { key: 3, label: 'Wednesday' },
  { key: 4, label: 'Thursday' },
  { key: 5, label: 'Friday' },
  { key: 6, label: 'Saturday' },
  { key: 7, label: 'Sunday' }
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2).toString().padStart(2, '0');
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hours}:${minutes}`;
});

const DEFAULT_AVAILABILITY: WeekAvailability = {
  1: { enabled: true, startTime: '09:00', endTime: '18:00' },
  2: { enabled: true, startTime: '09:00', endTime: '18:00' },
  3: { enabled: true, startTime: '09:00', endTime: '18:00' },
  4: { enabled: true, startTime: '09:00', endTime: '18:00' },
  5: { enabled: true, startTime: '09:00', endTime: '18:00' },
  6: { enabled: false, startTime: '10:00', endTime: '16:00' },
  7: { enabled: false, startTime: '10:00', endTime: '16:00' }
};

export function InlineCalendarCreation({ onCalendarCreated, onCancel }: InlineCalendarCreationProps) {
  const { t } = useTranslation('settings');
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [calendarName, setCalendarName] = useState('');
  // New calendars default to brand emerald (#10B981, in the palette); the full
  // multi-hue palette stays available for per-calendar colour-coding. Matches the
  // CreateCalendarDialog + service-default emerald default (B3/B8).
  const [selectedColor, setSelectedColor] = useState('#10B981');
  const [availability, setAvailability] = useState<WeekAvailability>(DEFAULT_AVAILABILITY);

  const updateDayAvailability = (day: number, updates: Partial<DayAvailability>) => {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], ...updates }
    }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) + '-' + Math.random().toString(36).substring(2, 6);
  };

  const handleSave = async () => {
    if (!calendarName.trim()) {
      toast({
        title: t('settings.services.inlineCalendar.nameRequiredError', 'Calendar name required'),
        description: t('settings.services.inlineCalendar.nameRequiredErrorDesc', 'Please enter a name for your calendar.'),
        variant: "destructive"
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: t('settings.services.inlineCalendar.notAuthError', 'Not authenticated'),
        description: t('settings.services.inlineCalendar.notAuthErrorDesc', 'Please log in to create a calendar.'),
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // 1. Create the calendar
      const { data: calendar, error: calendarError } = await supabase
        .from('calendars')
        .insert({
          user_id: user.id,
          name: calendarName.trim(),
          slug: generateSlug(calendarName),
          color: selectedColor,
          is_active: true,
          is_default: false,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
        .select()
        .single();

      if (calendarError) throw calendarError;

      // 2. Create the default availability schedule
      const { data: schedule, error: scheduleError } = await supabase
        .from('availability_schedules')
        .insert({
          calendar_id: calendar.id,
          name: 'Default Schedule',
          is_default: true
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // 3. Create availability rules for enabled days
      const rules = Object.entries(availability)
        .filter(([_, day]) => day.enabled)
        .map(([dayKey, day]) => ({
          schedule_id: schedule.id,
          day_of_week: parseInt(dayKey),
          start_time: day.startTime,
          end_time: day.endTime,
          is_available: true
        }));

      if (rules.length > 0) {
        const { error: rulesError } = await supabase
          .from('availability_rules')
          .insert(rules);

        if (rulesError) throw rulesError;
      }

      toast({
        title: t('settings.services.inlineCalendar.createdSuccess', 'Calendar created'),
        description: t('settings.services.inlineCalendar.createdSuccessDesc', '"{{calendarName}}" has been created with availability settings.', { calendarName })
      });

      onCalendarCreated(calendar);
    } catch (error: any) {
      console.error('Error creating calendar:', error);
      toast({
        title: t('settings.services.inlineCalendar.creationError', 'Error creating calendar'),
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 border-t border-white/[0.06] pt-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-1"
          aria-label={t('settings.services.inlineCalendar.backButton', 'Back to calendar selection')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-base font-semibold text-foreground">{t('settings.services.inlineCalendar.heading', 'Create new calendar')}</h3>
      </div>

      <div className="space-y-5 rounded-lg border border-white/[0.08] bg-muted/30 p-4 md:p-5">
        {/* Calendar Name */}
        <SettingsField label={t('settings.services.inlineCalendar.nameLabel', 'Calendar name')} htmlFor="calendar-name" required>
          <Input
            id="calendar-name"
            value={calendarName}
            onChange={(e) => setCalendarName(e.target.value)}
            placeholder={t('settings.services.inlineCalendar.namePlaceholder', 'e.g. My Salon')}
            disabled={saving}
          />
        </SettingsField>

        {/* Color Selection */}
        <SettingsField label={t('settings.services.inlineCalendar.colorLabel', 'Color')}>
          <ColorPicker
            value={selectedColor}
            onChange={setSelectedColor}
            disabled={saving}
            ariaLabel={t('settings.services.inlineCalendar.colorAriaLabel', 'Calendar color')}
          />
        </SettingsField>

        {/* Availability Times */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[13px] font-medium leading-[18px] text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {t('settings.services.inlineCalendar.availabilityLabel', 'Availability hours')}
          </div>

          <div className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.06]">
            {DAYS.map((day) => {
              const enabled = availability[day.key].enabled;
              return (
                <div key={day.key} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => updateDayAvailability(day.key, { enabled: checked })}
                    disabled={saving}
                    aria-label={t('settings.services.inlineCalendar.dayToggleAriaLabel', '{{dayName}} open', { dayName: day.label })}
                  />
                  <span className={`w-24 text-sm ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {day.label}
                  </span>

                  {enabled ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={availability[day.key].startTime}
                        onValueChange={(value) => updateDayAvailability(day.key, { startTime: value })}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-8 w-24 border-white/[0.08] bg-muted" aria-label={t('settings.services.inlineCalendar.dayStartTimeAriaLabel', '{{dayName}} opening time', { dayName: day.label })}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">–</span>
                      <Select
                        value={availability[day.key].endTime}
                        onValueChange={(value) => updateDayAvailability(day.key, { endTime: value })}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-8 w-24 border-white/[0.08] bg-muted" aria-label={t('settings.services.inlineCalendar.dayEndTimeAriaLabel', '{{dayName}} closing time', { dayName: day.label })}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t('settings.services.inlineCalendar.closedLabel', 'Closed')}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            {t('settings.services.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving || !calendarName.trim()}>
            {saving ? t('settings.services.inlineCalendar.savingButton', 'Creating…') : t('settings.services.inlineCalendar.saveButton', 'Save calendar')}
          </Button>
        </div>
      </div>
    </div>
  );
}
