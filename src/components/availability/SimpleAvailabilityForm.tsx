import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Save } from 'lucide-react';
import { useSimpleAvailability } from '@/hooks/useSimpleAvailability';

interface SimpleAvailabilityFormProps {
  calendarId: string;
  onSaveComplete?: () => void;
}

const days = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
];

const timezones = [
  { value: 'Europe/Amsterdam', label: 'Amsterdam (UTC+1)' },
  { value: 'Europe/London', label: 'London (UTC+0)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
  { value: 'Europe/Rome', label: 'Rome (UTC+1)' },
  { value: 'Europe/Madrid', label: 'Madrid (UTC+1)' },
  { value: 'Europe/Brussels', label: 'Brussels (UTC+1)' },
  { value: 'Europe/Vienna', label: 'Vienna (UTC+1)' },
  { value: 'Europe/Zurich', label: 'Zurich (UTC+1)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
  { value: 'America/Chicago', label: 'Chicago (UTC-6)' },
  { value: 'America/Denver', label: 'Denver (UTC-7)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+11)' },
  { value: 'UTC', label: 'UTC (UTC+0)' }
];

export const SimpleAvailabilityForm: React.FC<SimpleAvailabilityFormProps> = ({
  calendarId,
  onSaveComplete
}) => {
  const { availability, setAvailability, loading, saving, saveAvailability } = useSimpleAvailability(calendarId);

  const updateDay = (day: string, field: 'enabled' | 'startTime' | 'endTime', value: boolean | string) => {
    setAvailability(prev => {
      const dayData = prev[day as keyof typeof prev];
      if (typeof dayData === 'string') return prev; // Skip timezone field
      
      return {
        ...prev,
        [day]: {
          ...dayData,
          [field]: value
        }
      };
    });
  };

  const updateTimezone = (timezone: string) => {
    setAvailability(prev => ({
      ...prev,
      timezone
    }));
  };

  const handleSave = async () => {
    const success = await saveAvailability();
    if (success && onSaveComplete) {
      onSaveComplete();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading availability...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Set Your Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timezone Selection */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={availability.timezone} onValueChange={updateTimezone}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {timezones.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Days Configuration */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Weekly Schedule</Label>
          
          {days.map(day => {
            const dayData = availability[day.key as keyof typeof availability];
            if (typeof dayData === 'string') return null; // Skip timezone field
            
            return (
              <div key={day.key} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex items-center space-x-3 min-w-[120px]">
                  <Switch
                    checked={dayData.enabled}
                    onCheckedChange={(checked) => updateDay(day.key, 'enabled', checked)}
                  />
                  <Label className="font-medium">{day.label}</Label>
                </div>
                
                {dayData.enabled && (
                  <div className="flex items-center gap-4 flex-1">
                    <div className="space-y-1">
                      <Label htmlFor={`${day.key}-start`} className="text-sm">From</Label>
                      <Input
                        id={`${day.key}-start`}
                        type="time"
                        value={dayData.startTime}
                        onChange={(e) => updateDay(day.key, 'startTime', e.target.value)}
                        className="w-24"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${day.key}-end`} className="text-sm">To</Label>
                      <Input
                        id={`${day.key}-end`}
                        type="time"
                        value={dayData.endTime}
                        onChange={(e) => updateDay(day.key, 'endTime', e.target.value)}
                        className="w-24"
                      />
                    </div>
                  </div>
                )}
                
                {!dayData.enabled && (
                  <div className="flex-1 text-muted-foreground">
                    Closed
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Availability'}
        </Button>
      </CardContent>
    </Card>
  );
};