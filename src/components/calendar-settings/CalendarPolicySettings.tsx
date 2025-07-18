import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { CalendarSettings } from '@/types/database';

interface CalendarPolicySettingsProps {
  settings: CalendarSettings;
  onUpdate: (updates: Partial<CalendarSettings>) => void;
}

export function CalendarPolicySettings({ settings, onUpdate }: CalendarPolicySettingsProps) {
  // State for reminder unit types and custom mode tracking
  const [firstReminderUnit, setFirstReminderUnit] = useState<'hours' | 'days'>('hours');
  const [secondReminderUnit, setSecondReminderUnit] = useState<'minutes' | 'hours'>('minutes');
  
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
  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        {/* Time Slot Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-foreground font-medium">Default Slot Duration</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>The default length of time slots for appointments. This can be overridden by individual service types.</p>
                </TooltipContent>
              </Tooltip>
            </div>
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
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border shadow-lg">
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
                    type="text"
                    inputMode="numeric"
                    value={settings.slot_duration?.toString() ?? ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value === '') {
                        // Don't reset to preset when empty, just update with empty
                        onUpdate({ slot_duration: undefined });
                      } else {
                        const numValue = parseInt(value);
                        if (numValue > 0 && numValue <= 999) {
                          onUpdate({ slot_duration: numValue });
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      // Allow backspace, delete, arrow keys, tab
                      if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        return;
                      }
                      // Only allow numeric input
                      if (!/[0-9]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="bg-background border-border pr-20 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-muted-foreground/30"
                    placeholder="Enter minutes"
                    autoComplete="off"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    minutes
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSlotDurationCustom(false);
                    onUpdate({ slot_duration: 30 });
                  }}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Back to preset options
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-foreground font-medium">Buffer Time (minutes)</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Extra time added between appointments for preparation, cleanup, or travel. Prevents back-to-back bookings.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              value={settings.buffer_time ?? 0}
              onChange={(e) => onUpdate({ buffer_time: parseInt(e.target.value) || 0 })}
              className="bg-background border-border"
              min="0"
              max="120"
            />
          </div>
        </div>

        {/* Booking Limits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-foreground font-medium">Minimum Notice (hours)</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>The minimum time customers must book in advance. Prevents last-minute bookings that may be inconvenient.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              value={settings.minimum_notice_hours ?? 1}
              onChange={(e) => onUpdate({ minimum_notice_hours: parseInt(e.target.value) || 1 })}
              className="bg-background border-border"
              min="0"
              max="168"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-foreground font-medium">Booking Window (days)</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>How far into the future customers can book appointments. Helps you control your availability planning.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              value={settings.booking_window_days ?? 60}
              onChange={(e) => onUpdate({ booking_window_days: parseInt(e.target.value) || 60 })}
              className="bg-background border-border"
              min="1"
              max="365"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-foreground font-medium">Max Bookings Per Day</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Limits the total number of appointments per day. Useful for managing workload and preventing overbooked days.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            type="number"
            value={settings.max_bookings_per_day ?? ''}
            onChange={(e) => onUpdate({ max_bookings_per_day: e.target.value ? parseInt(e.target.value) : null })}
            className="bg-background border-border"
            min="1"
            max="50"
            placeholder="No limit"
          />
        </div>

        {/* Cancellation Policy */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Cancellation Policy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-foreground font-medium">Allow Cancellations</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Set rules for when customers can cancel appointments. Helps manage your schedule and reduce last-minute cancellations.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={settings.allow_cancellations ?? true}
                onCheckedChange={(checked) => onUpdate({ allow_cancellations: checked })}
              />
            </div>

            {settings.allow_cancellations !== false && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-foreground font-medium">Cancellation Deadline</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>How far in advance customers must cancel to avoid penalties. Protects your time from last-minute changes.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border shadow-lg">
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
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={settings.cancellation_deadline_hours?.toString() ?? ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            if (value === '') {
                              onUpdate({ cancellation_deadline_hours: undefined });
                            } else {
                              const numValue = parseFloat(value);
                              if (numValue >= 0 && numValue <= 168) {
                                onUpdate({ cancellation_deadline_hours: numValue });
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            // Allow backspace, delete, arrow keys, tab, decimal point
                            if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '.'].includes(e.key)) {
                              return;
                            }
                            // Only allow numeric input
                            if (!/[0-9]/.test(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className="bg-background border-border pr-16 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-muted-foreground/30"
                          placeholder="Enter hours"
                          autoComplete="off"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                          hours
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCancellationCustom(false);
                          onUpdate({ cancellation_deadline_hours: 24 });
                        }}
                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        Back to preset options
                      </button>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Reminders */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Reminders</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-foreground font-medium">First Reminder</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Send an early reminder well in advance. Helps customers plan ahead and reduces scheduling conflicts.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={settings.first_reminder_enabled ?? false}
                  onCheckedChange={(checked) => onUpdate({ first_reminder_enabled: checked })}
                />
              </div>

              {settings.first_reminder_enabled && (
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Timing</Label>
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
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
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
                                    if (hoursValue <= 8760) { // Max 1 year
                                      onUpdate({ first_reminder_timing_hours: hoursValue });
                                    }
                                  }
                                }
                              }}
                              onKeyDown={(e) => {
                                // Allow all normal editing keys
                                if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter', 'Escape'].includes(e.key)) {
                                  return;
                                }
                                // Only allow numeric input for other keys
                                if (!/[0-9]/.test(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              className="bg-background border-border [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-muted-foreground/50"
                              placeholder={`Enter ${firstReminderUnit}`}
                              autoComplete="off"
                            />
                          </div>
                          <Select value={firstReminderUnit} onValueChange={(value: 'hours' | 'days') => {
                            // Convert current value to new unit when changing
                            if (settings.first_reminder_timing_hours !== undefined) {
                              const currentDisplayValue = convertFirstReminderFromHours(settings.first_reminder_timing_hours, firstReminderUnit);
                              const newHoursValue = convertFirstReminderToHours(currentDisplayValue, value);
                              onUpdate({ first_reminder_timing_hours: newHoursValue });
                            }
                            setFirstReminderUnit(value);
                          }}>
                            <SelectTrigger className="w-24 bg-background border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background border-border shadow-lg">
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
                          className="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          Back to preset options
                        </button>
                      </div>
                    )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-foreground font-medium">Second Reminder</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Final reminder close to the appointment. Automatic WhatsApp reminders reduce no-shows significantly.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={settings.second_reminder_enabled ?? false}
                  onCheckedChange={(checked) => onUpdate({ second_reminder_enabled: checked })}
                />
              </div>

              {settings.second_reminder_enabled && (
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Timing</Label>
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
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg">
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
                                    if (minutesValue <= 1440) { // Max 24 hours
                                      onUpdate({ second_reminder_timing_minutes: minutesValue });
                                    }
                                  }
                                }
                              }}
                              onKeyDown={(e) => {
                                // Allow all normal editing keys
                                if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter', 'Escape'].includes(e.key)) {
                                  return;
                                }
                                // Only allow numeric input for other keys
                                if (!/[0-9]/.test(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              className="bg-background border-border [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-muted-foreground/50"
                              placeholder={`Enter ${secondReminderUnit}`}
                              autoComplete="off"
                            />
                          </div>
                          <Select value={secondReminderUnit} onValueChange={(value: 'minutes' | 'hours') => {
                            // Convert current value to new unit when changing
                            if (settings.second_reminder_timing_minutes !== undefined) {
                              const currentDisplayValue = convertSecondReminderFromMinutes(settings.second_reminder_timing_minutes, secondReminderUnit);
                              const newMinutesValue = convertSecondReminderToMinutes(currentDisplayValue, value);
                              onUpdate({ second_reminder_timing_minutes: newMinutesValue });
                            }
                            setSecondReminderUnit(value);
                          }}>
                            <SelectTrigger className="w-24 bg-background border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background border-border shadow-lg">
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
                          className="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          Back to preset options
                        </button>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}