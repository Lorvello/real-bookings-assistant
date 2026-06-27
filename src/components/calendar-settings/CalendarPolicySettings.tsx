import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CalendarSettings } from '@/types/database';
import { SettingsField } from '@/components/settings/SettingsField';

interface CalendarPolicySettingsProps {
  settings: CalendarSettings;
  onUpdate: (updates: Partial<CalendarSettings>) => void;
}

// One consistent trigger style so every select matches the premium <Input>
// (muted surface + hairline white-alpha border) instead of the old off-brand greys.
const triggerClass = 'bg-muted border-white/[0.08]';

// A calm toggle row (label + inline explanation + switch) — premium products
// explain inline rather than hide the reason behind an info icon.
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <div className="min-w-0 space-y-1">
        <p className="text-[13px] font-medium leading-[18px] text-foreground">{label}</p>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export function CalendarPolicySettings({ settings, onUpdate }: CalendarPolicySettingsProps) {
  const { t } = useTranslation('settings');
  // State for reminder unit types and custom mode tracking
  const [firstReminderUnit, setFirstReminderUnit] = useState<'hours' | 'days'>('hours');
  const [secondReminderUnit, setSecondReminderUnit] = useState<'minutes' | 'hours'>('minutes');
  const [cancellationUnit, setCancellationUnit] = useState<'minutes' | 'hours' | 'days'>('hours');

  // Track when custom mode is explicitly active (prevents accidental closure)
  const [isSlotDurationCustom, setIsSlotDurationCustom] = useState(false);
  const [isCancellationCustom, setIsCancellationCustom] = useState(false);
  const [isFirstReminderCustom, setIsFirstReminderCustom] = useState(false);
  const [isSecondReminderCustom, setIsSecondReminderCustom] = useState(false);

  // Helper functions to convert between units
  const convertFirstReminderToHours = (value: number, unit: 'hours' | 'days'): number => {
    return unit === 'days' ? value * 24 : value;
  };

  const convertFirstReminderFromHours = (hours: number, unit: 'hours' | 'days'): number => {
    return unit === 'days' ? Math.round(hours / 24) : hours;
  };

  const convertSecondReminderToMinutes = (value: number, unit: 'minutes' | 'hours'): number => {
    return unit === 'hours' ? value * 60 : value;
  };

  const convertSecondReminderFromMinutes = (minutes: number, unit: 'minutes' | 'hours'): number => {
    return unit === 'hours' ? Math.round(minutes / 60) : minutes;
  };

  // Helper functions for cancellation deadline unit conversion
  const convertCancellationToHours = (value: number, unit: 'minutes' | 'hours' | 'days'): number => {
    if (unit === 'minutes') return value / 60;
    if (unit === 'days') return value * 24;
    return value; // hours
  };

  const convertCancellationFromHours = (hours: number, unit: 'minutes' | 'hours' | 'days'): number => {
    if (unit === 'minutes') return Math.round(hours * 60);
    if (unit === 'days') return Math.round(hours / 24);
    return hours; // hours
  };

  const backToPresetClass =
    'rounded text-xs font-medium text-accent-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  return (
    <div className="space-y-8">
      {/* Time & slots */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
        <SettingsField
          label={t('settings.operations.fields.slotDuration.label', 'Default slot duration')}
          htmlFor="slot_duration"
          description={t('settings.operations.fields.slotDuration.description', 'The standard appointment length. Individual services can override this.')}
        >
          {!isSlotDurationCustom && [15, 30, 45, 60, 90, 120].includes(settings.slot_duration ?? 30) ? (
            <Select
              value={settings.slot_duration?.toString() ?? '30'}
              onValueChange={(value) => {
                if (value === 'other') {
                  setIsSlotDurationCustom(true);
                  onUpdate({ slot_duration: undefined });
                } else {
                  setIsSlotDurationCustom(false);
                  onUpdate({ slot_duration: parseInt(value) });
                }
              }}
            >
              <SelectTrigger id="slot_duration" className={triggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">120 minutes</SelectItem>
                <SelectItem value="other">Custom duration</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="slot_duration"
                  type="text"
                  inputMode="numeric"
                  value={settings.slot_duration?.toString() ?? ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value === '') {
                      onUpdate({ slot_duration: undefined });
                    } else {
                      const numValue = parseInt(value);
                      if (numValue > 0 && numValue <= 999) {
                        onUpdate({ slot_duration: numValue });
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                      return;
                    }
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="pr-20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  placeholder={t('settings.operations.fields.slotDuration.customPlaceholder', 'Enter minutes')}
                  autoComplete="off"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {t('settings.operations.suffix.minutes', 'minutes')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSlotDurationCustom(false);
                  onUpdate({ slot_duration: 30 });
                }}
                className={backToPresetClass}
              >
                {t('settings.operations.buttons.backToPresets', 'Back to preset options')}
              </button>
            </div>
          )}
        </SettingsField>

        <SettingsField
          label={t('settings.operations.fields.bufferTime.label', 'Buffer time')}
          htmlFor="buffer_time"
          description={t('settings.operations.fields.bufferTime.description', 'Extra minutes kept free between appointments for cleanup or travel. Prevents back-to-back bookings.')}
        >
          <div className="relative">
            <Input
              id="buffer_time"
              type="text"
              inputMode="numeric"
              value={settings.buffer_time?.toString() ?? '0'}
              onChange={(e) => {
                const value = e.target.value.replace(/^0+(?=\d)/, '').replace(/[^0-9]/g, '');
                const numValue = value === '' ? 0 : Math.min(parseInt(value), 120);
                onUpdate({ buffer_time: numValue });
              }}
              onFocus={(e) => e.target.select()}
              className="pr-20"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {t('settings.operations.suffix.minutes', 'minutes')}
            </span>
          </div>
        </SettingsField>

        <SettingsField
          label={t('settings.operations.fields.minimumNotice.label', 'Minimum notice')}
          htmlFor="minimum_notice_hours"
          description={t('settings.operations.fields.minimumNotice.description', 'How far ahead customers must book. Blocks inconvenient last-minute requests.')}
        >
          <div className="relative">
            <Input
              id="minimum_notice_hours"
              type="text"
              inputMode="numeric"
              value={settings.minimum_notice_hours?.toString() ?? '24'}
              onChange={(e) => {
                const value = e.target.value.replace(/^0+(?=\d)/, '').replace(/[^0-9]/g, '');
                const numValue = value === '' ? 24 : Math.min(parseInt(value), 168);
                onUpdate({ minimum_notice_hours: numValue });
              }}
              onFocus={(e) => e.target.select()}
              className="pr-16"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {t('settings.operations.suffix.hours', 'hours')}
            </span>
          </div>
        </SettingsField>

        <SettingsField
          label={t('settings.operations.fields.bookingWindow.label', 'Booking window')}
          htmlFor="booking_window_days"
          description={t('settings.operations.fields.bookingWindow.description', 'How far into the future customers can book. Keeps your calendar plannable.')}
        >
          <div className="relative">
            <Input
              id="booking_window_days"
              type="text"
              inputMode="numeric"
              value={settings.booking_window_days?.toString() ?? '60'}
              onChange={(e) => {
                const value = e.target.value.replace(/^0+(?=\d)/, '').replace(/[^0-9]/g, '');
                const numValue = value === '' ? 60 : Math.min(parseInt(value), 365);
                onUpdate({ booking_window_days: numValue });
              }}
              onFocus={(e) => e.target.select()}
              className="pr-14"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {t('settings.operations.suffix.days', 'days')}
            </span>
          </div>
        </SettingsField>
      </div>

      <SettingsField
        label={t('settings.operations.fields.maxBookingsPerDay.label', 'Maximum bookings per day')}
        htmlFor="max_bookings_per_day"
        description={t('settings.operations.fields.maxBookingsPerDay.description', 'Caps total appointments per day to protect your workload. Leave empty for no limit.')}
        className="md:max-w-[calc(50%-0.75rem)]"
      >
        <Input
          id="max_bookings_per_day"
          type="text"
          inputMode="numeric"
          value={settings.max_bookings_per_day?.toString() ?? ''}
          onChange={(e) => {
            const value = e.target.value.replace(/^0+(?=\d)/, '').replace(/[^0-9]/g, '');
            const numValue = value === '' ? null : Math.min(parseInt(value), 50);
            onUpdate({ max_bookings_per_day: numValue });
          }}
          placeholder={t('settings.operations.fields.maxBookingsPerDay.placeholder', 'No limit')}
        />
      </SettingsField>

      {/* Cancellation policy */}
      <div className="space-y-5 border-t border-white/[0.05] pt-7">
        <h4 className="text-sm font-semibold tracking-[-0.01em] text-foreground">{t('settings.operations.sections.cancellation.title', 'Cancellation policy')}</h4>
        <ToggleRow
          label={t('settings.operations.fields.allowCancellations.label', 'Allow cancellations')}
          description={t('settings.operations.fields.allowCancellations.description', 'Let customers cancel through the assistant. Turn off to require they contact you directly.')}
          checked={settings.allow_cancellations ?? true}
          onChange={(checked) => onUpdate({ allow_cancellations: checked })}
        />

        {settings.allow_cancellations !== false && (
          <SettingsField
            label={t('settings.operations.fields.cancellationDeadline.label', 'Cancellation deadline')}
            htmlFor="cancellation_deadline"
            description={t('settings.operations.fields.cancellationDeadline.description', 'How far in advance a customer must cancel to avoid a penalty.')}
            className="md:max-w-[calc(50%-0.75rem)]"
          >
            {!isCancellationCustom && [0.5, 1, 2, 6, 24].includes(settings.cancellation_deadline_hours ?? 24) ? (
              <Select
                value={settings.cancellation_deadline_hours?.toString() ?? '24'}
                onValueChange={(value) => {
                  if (value === 'other') {
                    setIsCancellationCustom(true);
                    onUpdate({ cancellation_deadline_hours: undefined });
                  } else {
                    setIsCancellationCustom(false);
                    onUpdate({ cancellation_deadline_hours: parseFloat(value) });
                  }
                }}
              >
                <SelectTrigger id="cancellation_deadline" className={triggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">30 minutes before</SelectItem>
                  <SelectItem value="1">1 hour before</SelectItem>
                  <SelectItem value="2">2 hours before</SelectItem>
                  <SelectItem value="6">6 hours before</SelectItem>
                  <SelectItem value="24">24 hours before</SelectItem>
                  <SelectItem value="other">Custom deadline</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      id="cancellation_deadline"
                      type="text"
                      inputMode="numeric"
                      value={
                        settings.cancellation_deadline_hours !== undefined
                          ? convertCancellationFromHours(settings.cancellation_deadline_hours, cancellationUnit).toString()
                          : ''
                      }
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        if (value === '') {
                          onUpdate({ cancellation_deadline_hours: undefined });
                        } else {
                          const numValue = parseInt(value);
                          if (numValue > 0) {
                            const hoursValue = convertCancellationToHours(numValue, cancellationUnit);
                            if (hoursValue <= 8760) {
                              onUpdate({ cancellation_deadline_hours: hoursValue });
                            }
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter', 'Escape'].includes(e.key)) {
                          return;
                        }
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      placeholder={t('settings.operations.fields.cancellationDeadline.customPlaceholder', 'Enter {{unit}}', { unit: cancellationUnit })}
                      autoComplete="off"
                    />
                  </div>
                  <Select
                    value={cancellationUnit}
                    onValueChange={(value: 'minutes' | 'hours' | 'days') => {
                      if (settings.cancellation_deadline_hours !== undefined) {
                        const currentDisplayValue = convertCancellationFromHours(settings.cancellation_deadline_hours, cancellationUnit);
                        const newHoursValue = convertCancellationToHours(currentDisplayValue, value);
                        onUpdate({ cancellation_deadline_hours: newHoursValue });
                      }
                      setCancellationUnit(value);
                    }}
                  >
                    <SelectTrigger aria-label={t('settings.operations.fields.cancellationDeadline.unitAriaLabel', 'Cancellation deadline unit')} className={`w-28 ${triggerClass}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">minutes</SelectItem>
                      <SelectItem value="hours">hours</SelectItem>
                      <SelectItem value="days">days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCancellationCustom(false);
                    setCancellationUnit('hours');
                    onUpdate({ cancellation_deadline_hours: 24 });
                  }}
                  className={backToPresetClass}
                >
                  {t('settings.operations.buttons.backToPresets', 'Back to preset options')}
                </button>
              </div>
            )}
          </SettingsField>
        )}
      </div>

      {/* Reminders */}
      <div className="space-y-5 border-t border-white/[0.05] pt-7">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold tracking-[-0.01em] text-foreground">{t('settings.operations.sections.reminders.title', 'Reminders')}</h4>
          <p className="text-xs leading-5 text-muted-foreground">
            {t('settings.operations.sections.reminders.description', 'Automatic reminders before the appointment cut no-shows significantly.')}
          </p>
        </div>

        <div className="space-y-7">
          <div className="space-y-4">
            <ToggleRow
              label={t('settings.operations.fields.firstReminder.label', 'First reminder')}
              description={t('settings.operations.fields.firstReminder.description', 'An early heads-up well before the appointment, so customers can plan.')}
              checked={settings.first_reminder_enabled ?? false}
              onChange={(checked) => onUpdate({ first_reminder_enabled: checked })}
            />

            {settings.first_reminder_enabled && (
              <SettingsField label={t('settings.operations.fields.firstReminder.timingLabel', 'Timing')} htmlFor="first_reminder_timing" className="md:max-w-[calc(50%-0.75rem)]">
                {!isFirstReminderCustom && [24, 48, 72, 168].includes(settings.first_reminder_timing_hours ?? 24) ? (
                  <Select
                    value={settings.first_reminder_timing_hours?.toString() ?? '24'}
                    onValueChange={(value) => {
                      if (value === 'other') {
                        setIsFirstReminderCustom(true);
                        onUpdate({ first_reminder_timing_hours: undefined });
                      } else {
                        setIsFirstReminderCustom(false);
                        onUpdate({ first_reminder_timing_hours: parseInt(value) });
                      }
                    }}
                  >
                    <SelectTrigger id="first_reminder_timing" className={triggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">1 day before</SelectItem>
                      <SelectItem value="48">2 days before</SelectItem>
                      <SelectItem value="72">3 days before</SelectItem>
                      <SelectItem value="168">1 week before</SelectItem>
                      <SelectItem value="other">Custom timing</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          id="first_reminder_timing"
                          type="text"
                          inputMode="numeric"
                          value={
                            settings.first_reminder_timing_hours !== undefined
                              ? convertFirstReminderFromHours(settings.first_reminder_timing_hours, firstReminderUnit).toString()
                              : ''
                          }
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            if (value === '') {
                              onUpdate({ first_reminder_timing_hours: undefined });
                            } else {
                              const numValue = parseInt(value);
                              if (numValue > 0) {
                                const hoursValue = convertFirstReminderToHours(numValue, firstReminderUnit);
                                if (hoursValue <= 8760) {
                                  onUpdate({ first_reminder_timing_hours: hoursValue });
                                }
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter', 'Escape'].includes(e.key)) {
                              return;
                            }
                            if (!/[0-9]/.test(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder={t('settings.operations.fields.cancellationDeadline.customPlaceholder', 'Enter {{unit}}', { unit: firstReminderUnit })}
                          autoComplete="off"
                        />
                      </div>
                      <Select
                        value={firstReminderUnit}
                        onValueChange={(value: 'hours' | 'days') => {
                          if (settings.first_reminder_timing_hours !== undefined) {
                            const currentDisplayValue = convertFirstReminderFromHours(settings.first_reminder_timing_hours, firstReminderUnit);
                            const newHoursValue = convertFirstReminderToHours(currentDisplayValue, value);
                            onUpdate({ first_reminder_timing_hours: newHoursValue });
                          }
                          setFirstReminderUnit(value);
                        }}
                      >
                        <SelectTrigger aria-label={t('settings.operations.fields.firstReminder.unitAriaLabel', 'First reminder timing unit')} className={`w-28 ${triggerClass}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hours">hours</SelectItem>
                          <SelectItem value="days">days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFirstReminderCustom(false);
                        setFirstReminderUnit('hours');
                        onUpdate({ first_reminder_timing_hours: 24 });
                      }}
                      className={backToPresetClass}
                    >
                      {t('settings.operations.buttons.backToPresets', 'Back to preset options')}
                    </button>
                  </div>
                )}
              </SettingsField>
            )}
          </div>

          <div className="space-y-4">
            <ToggleRow
              label={t('settings.operations.fields.secondReminder.label', 'Second reminder')}
              description={t('settings.operations.fields.secondReminder.description', 'A final nudge close to the appointment time.')}
              checked={settings.second_reminder_enabled ?? false}
              onChange={(checked) => onUpdate({ second_reminder_enabled: checked })}
            />

            {settings.second_reminder_enabled && (
              <SettingsField label={t('settings.operations.fields.firstReminder.timingLabel', 'Timing')} htmlFor="second_reminder_timing" className="md:max-w-[calc(50%-0.75rem)]">
                {!isSecondReminderCustom && [30, 60, 120, 180].includes(settings.second_reminder_timing_minutes ?? 60) ? (
                  <Select
                    value={settings.second_reminder_timing_minutes?.toString() ?? '60'}
                    onValueChange={(value) => {
                      if (value === 'other') {
                        setIsSecondReminderCustom(true);
                        onUpdate({ second_reminder_timing_minutes: undefined });
                      } else {
                        setIsSecondReminderCustom(false);
                        onUpdate({ second_reminder_timing_minutes: parseInt(value) });
                      }
                    }}
                  >
                    <SelectTrigger id="second_reminder_timing" className={triggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes before</SelectItem>
                      <SelectItem value="60">1 hour before</SelectItem>
                      <SelectItem value="120">2 hours before</SelectItem>
                      <SelectItem value="180">3 hours before</SelectItem>
                      <SelectItem value="other">Custom timing</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          id="second_reminder_timing"
                          type="text"
                          inputMode="numeric"
                          value={
                            settings.second_reminder_timing_minutes !== undefined
                              ? convertSecondReminderFromMinutes(settings.second_reminder_timing_minutes, secondReminderUnit).toString()
                              : ''
                          }
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            if (value === '') {
                              onUpdate({ second_reminder_timing_minutes: undefined });
                            } else {
                              const numValue = parseInt(value);
                              if (numValue > 0) {
                                const minutesValue = convertSecondReminderToMinutes(numValue, secondReminderUnit);
                                if (minutesValue <= 1440) {
                                  onUpdate({ second_reminder_timing_minutes: minutesValue });
                                }
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter', 'Escape'].includes(e.key)) {
                              return;
                            }
                            if (!/[0-9]/.test(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder={t('settings.operations.fields.cancellationDeadline.customPlaceholder', 'Enter {{unit}}', { unit: secondReminderUnit })}
                          autoComplete="off"
                        />
                      </div>
                      <Select
                        value={secondReminderUnit}
                        onValueChange={(value: 'minutes' | 'hours') => {
                          if (settings.second_reminder_timing_minutes !== undefined) {
                            const currentDisplayValue = convertSecondReminderFromMinutes(settings.second_reminder_timing_minutes, secondReminderUnit);
                            const newMinutesValue = convertSecondReminderToMinutes(currentDisplayValue, value);
                            onUpdate({ second_reminder_timing_minutes: newMinutesValue });
                          }
                          setSecondReminderUnit(value);
                        }}
                      >
                        <SelectTrigger aria-label={t('settings.operations.fields.secondReminder.unitAriaLabel', 'Second reminder timing unit')} className={`w-28 ${triggerClass}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">minutes</SelectItem>
                          <SelectItem value="hours">hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondReminderCustom(false);
                        setSecondReminderUnit('minutes');
                        onUpdate({ second_reminder_timing_minutes: 60 });
                      }}
                      className={backToPresetClass}
                    >
                      {t('settings.operations.buttons.backToPresets', 'Back to preset options')}
                    </button>
                  </div>
                )}
              </SettingsField>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
