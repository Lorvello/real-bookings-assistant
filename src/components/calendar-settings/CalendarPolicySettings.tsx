
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarSettings } from '@/types/database';

interface CalendarPolicySettingsProps {
  settings: CalendarSettings;
  onUpdate: (updates: Partial<CalendarSettings>) => void;
}

export function CalendarPolicySettings({ settings, onUpdate }: CalendarPolicySettingsProps) {
  return (
    <div className="space-y-6">
      {/* Time Slot Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-foreground font-medium">Default Slot Duration</Label>
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
          <Label className="text-foreground font-medium">Buffer Time (minutes)</Label>
          <Input
            type="number"
            value={settings.buffer_time ?? 0}
            onChange={(e) => onUpdate({ buffer_time: parseInt(e.target.value) || 0 })}
            className="bg-background border-border"
            min="0"
            max="120"
          />
          <p className="text-xs text-muted-foreground">Time between appointments</p>
        </div>
      </div>

      {/* Booking Limits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-foreground font-medium">Minimum Notice (hours)</Label>
          <Input
            type="number"
            value={settings.minimum_notice_hours ?? 1}
            onChange={(e) => onUpdate({ minimum_notice_hours: parseInt(e.target.value) || 1 })}
            className="bg-background border-border"
            min="0"
            max="168"
          />
          <p className="text-xs text-muted-foreground">How far in advance bookings are required</p>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-medium">Booking Window (days)</Label>
          <Input
            type="number"
            value={settings.booking_window_days ?? 60}
            onChange={(e) => onUpdate({ booking_window_days: parseInt(e.target.value) || 60 })}
            className="bg-background border-border"
            min="1"
            max="365"
          />
          <p className="text-xs text-muted-foreground">How far in the future bookings are allowed</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground font-medium">Max Bookings Per Day</Label>
        <Input
          type="number"
          value={settings.max_bookings_per_day ?? ''}
          onChange={(e) => onUpdate({ max_bookings_per_day: e.target.value ? parseInt(e.target.value) : null })}
          className="bg-background border-border"
          min="1"
          max="50"
          placeholder="No limit"
        />
        <p className="text-xs text-muted-foreground">Leave empty for no daily limit</p>
      </div>
    </div>
  );
}
