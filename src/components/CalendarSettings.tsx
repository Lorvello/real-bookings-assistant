
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { CalendarBasicSettings } from './calendar-settings/CalendarBasicSettings';
import { CalendarPolicySettings } from './calendar-settings/CalendarPolicySettings';
import { CalendarRequiredFields } from './calendar-settings/CalendarRequiredFields';
import { Separator } from '@/components/ui/separator';

interface CalendarSettingsProps {
  calendarId: string;
}

export function CalendarSettings({ calendarId }: CalendarSettingsProps) {
  const { settings, loading, updateSettings } = useCalendarSettings(calendarId);

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card className="border-border">
        <CardContent className="p-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No settings found
            </h3>
            <p className="text-muted-foreground">
              Settings will be created automatically when you make changes.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Basic Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarBasicSettings 
            settings={settings}
            onUpdate={updateSettings}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Booking Policies */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Booking Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarPolicySettings 
            settings={settings}
            onUpdate={updateSettings}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Required Information */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Required Information</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarRequiredFields 
            settings={settings}
            onUpdate={updateSettings}
          />
        </CardContent>
      </Card>
    </div>
  );
}
