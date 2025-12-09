
import React, { useState } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export function InlineCalendarCreation({ onCalendarCreated, onCancel }: InlineCalendarCreationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [calendarName, setCalendarName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
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
        title: "Calendar name required",
        description: "Please enter a name for your calendar.",
        variant: "destructive"
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Not authenticated",
        description: "Please log in to create a calendar.",
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
        title: "Calendar created",
        description: `"${calendarName}" has been created with availability settings.`
      });

      onCalendarCreated(calendar);
    } catch (error: any) {
      console.error('Error creating calendar:', error);
      toast({
        title: "Error creating calendar",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCancel}
          className="p-1 h-8 w-8"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-medium text-foreground">Create new calendar</h3>
      </div>

      <Card className="p-4 space-y-4">
        {/* Calendar Name */}
        <div className="space-y-2">
          <Label htmlFor="calendar-name">Calendar name *</Label>
          <Input
            id="calendar-name"
            value={calendarName}
            onChange={(e) => setCalendarName(e.target.value)}
            placeholder="e.g. My Salon"
            disabled={saving}
          />
        </div>

        {/* Color Selection */}
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedColor === color ? 'border-foreground scale-110' : 'border-border'
                }`}
                style={{ backgroundColor: color }}
                type="button"
                disabled={saving}
              />
            ))}
          </div>
        </div>

        {/* Availability Times */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Label>Availability hours</Label>
          </div>
          
          <div className="space-y-2">
            {DAYS.map((day) => (
              <div key={day.key} className="flex items-center gap-3 py-2">
                <Switch
                  checked={availability[day.key].enabled}
                  onCheckedChange={(checked) => updateDayAvailability(day.key, { enabled: checked })}
                  disabled={saving}
                />
                <span className={`w-24 text-sm ${availability[day.key].enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {day.label}
                </span>
                
                {availability[day.key].enabled ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={availability[day.key].startTime}
                      onValueChange={(value) => updateDayAvailability(day.key, { startTime: value })}
                      disabled={saving}
                    >
                      <SelectTrigger className="w-24 h-8">
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
                      <SelectTrigger className="w-24 h-8">
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
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !calendarName.trim()}>
            {saving ? 'Creating...' : 'Save Calendar'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
