
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarSettings } from '@/components/CalendarSettings';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { CalendarSelectionCard } from './CalendarSelectionCard';
import { GlobalSettings } from '@/components/calendar-settings/GlobalSettings';
import { CalendarRequiredEmptyState } from '@/components/ui/CalendarRequiredEmptyState';

export function CalendarTab() {
  const navigate = useNavigate();
  const { selectedCalendar, calendars } = useCalendarContext();
  const { saving } = useCalendarSettings(selectedCalendar?.id);

  // Always show Global Settings regardless of calendar selection
  const renderGlobalSettings = () => (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">Global Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <GlobalSettings />
      </CardContent>
    </Card>
  );

  // Surface availability (the #1 operational setting) from the Operations tab. The
  // full editor lives on /availability; opening_hours genuinely reaches the WhatsApp
  // agent, so it directly shapes the slots customers are offered.
  const renderAvailabilityCard = () => (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Availability &amp; Opening Hours
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Set your weekly opening hours and date-specific overrides. The WhatsApp agent uses this to offer customers only the slots you're actually open.
        </p>
        <Button onClick={() => navigate('/availability')} className="shrink-0">
          Manage availability
        </Button>
      </CardContent>
    </Card>
  );

  if (calendars.length === 0) {
    return (
      <div className="space-y-6">
        {renderGlobalSettings()}
        <Separator />
        <CalendarRequiredEmptyState
          title="No calendar found"
          description="You don't have any calendars yet. Create one to start managing your operations settings."
        />
      </div>
    );
  }

  if (!selectedCalendar) {
    return (
      <div className="space-y-6">
        {renderGlobalSettings()}
        <Separator />
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">Select a Calendar</h3>
          <p className="text-muted-foreground">
            Choose a calendar to manage its operations settings.
          </p>
        </div>
        <CalendarSelectionCard hideAllCalendarsOption={true} />
        {renderAvailabilityCard()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderGlobalSettings()}
      <Separator />
      <CalendarSelectionCard hideAllCalendarsOption={true} />
      
      {/* Auto-save indicator */}
      {saving && (
        <div className="flex items-center justify-center bg-blue-800/90 border border-blue-700/50 rounded-2xl shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
            <p className="text-blue-200 text-sm">Saving...</p>
          </div>
        </div>
      )}
      
      <CalendarSettings calendarId={selectedCalendar.id} showGlobalSettings={false} />
    </div>
  );
}
