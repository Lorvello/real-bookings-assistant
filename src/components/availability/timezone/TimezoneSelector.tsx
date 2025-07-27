import React, { useState } from 'react';
import { Globe, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTimezoneManager } from '@/hooks/availability/useTimezoneManager';
import { COMPREHENSIVE_TIMEZONES } from '@/data/timezones';

interface TimezoneSelectorProps {
  onTimezoneChange?: (timezone: string) => void;
  showCard?: boolean;
}

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({ 
  onTimezoneChange,
  showCard = true 
}) => {
  const { currentTimezone, saving, updateTimezone, getCurrentTime } = useTimezoneManager();
  const [selectedTimezone, setSelectedTimezone] = useState(currentTimezone);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    try {
      await updateTimezone(selectedTimezone);
      setIsEditing(false);
      onTimezoneChange?.(selectedTimezone);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleCancel = () => {
    setSelectedTimezone(currentTimezone);
    setIsEditing(false);
  };

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Timezone</h3>
        </div>
        {!isEditing && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {COMPREHENSIVE_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex space-x-2">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={saving}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="font-medium text-foreground">
                {COMPREHENSIVE_TIMEZONES.find(tz => tz.value === currentTimezone)?.label || currentTimezone}
              </p>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Current time: {getCurrentTime()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (!showCard) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Globe className="h-5 w-5" />
          <span>Timezone Settings</span>
        </CardTitle>
        <CardDescription>
          Manage your calendar's timezone for accurate scheduling
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};