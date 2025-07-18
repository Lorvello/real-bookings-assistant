import React from 'react';
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
            <Select 
              value={settings.slot_duration?.toString() ?? '30'} 
              onValueChange={(value) => onUpdate({ slot_duration: parseInt(value) })}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">120 minutes</SelectItem>
              </SelectContent>
            </Select>
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
                <Select 
                  value={settings.cancellation_deadline_hours?.toString() ?? '24'} 
                  onValueChange={(value) => onUpdate({ cancellation_deadline_hours: parseInt(value) })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">30 minutes before</SelectItem>
                    <SelectItem value="1">1 hour before</SelectItem>
                    <SelectItem value="2">2 hours before</SelectItem>
                    <SelectItem value="6">6 hours before</SelectItem>
                    <SelectItem value="24">24 hours before</SelectItem>
                  </SelectContent>
                </Select>
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
                      <p>Automatic WhatsApp reminders reduce no-shows by keeping appointments top-of-mind for your customers.</p>
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
                  <Select 
                    value={settings.first_reminder_timing_minutes?.toString() ?? '60'} 
                    onValueChange={(value) => onUpdate({ first_reminder_timing_minutes: parseInt(value) })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes before</SelectItem>
                      <SelectItem value="60">1 hour before</SelectItem>
                      <SelectItem value="120">2 hours before</SelectItem>
                      <SelectItem value="180">3 hours before</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <p>Send an additional reminder well in advance. Helps customers plan ahead and reduces scheduling conflicts.</p>
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
                  <Select 
                    value={settings.second_reminder_timing_hours?.toString() ?? '24'} 
                    onValueChange={(value) => onUpdate({ second_reminder_timing_hours: parseInt(value) })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">1 day before</SelectItem>
                      <SelectItem value="48">2 days before</SelectItem>
                      <SelectItem value="72">3 days before</SelectItem>
                      <SelectItem value="168">1 week before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}