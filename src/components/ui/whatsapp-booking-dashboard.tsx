
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RealtimeDashboard } from '@/components/RealtimeDashboard';
import { TodaysScheduleCard } from '@/components/dashboard/TodaysScheduleCard';
import { AiBotStatusCard } from '@/components/dashboard/AiBotStatusCard';
import { useConversationCalendar } from '@/contexts/ConversationCalendarContext';
import { useCalendars } from '@/hooks/useCalendars';
import { CalendarRequiredEmptyState } from '@/components/ui/CalendarRequiredEmptyState';

export default function WhatsAppBookingDashboard() {
  const { selectedCalendarId } = useConversationCalendar();
  const { calendars } = useCalendars();

  const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
  const currentCalendarId = selectedCalendarId || defaultCalendar?.id;

  if (!currentCalendarId) {
    return (
      <CalendarRequiredEmptyState
        title="Connect WhatsApp to Your Calendar"
        description="Create a calendar first to enable WhatsApp booking functionality for your business."
      />
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overzicht van je afspraken, WhatsApp activiteit en real-time statistieken
          </p>
        </div>
      </div>

      {/* Real-time dashboard metrics */}
      <RealtimeDashboard calendarId={currentCalendarId} />
      
      {/* Today's activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodaysScheduleCard />
        <AiBotStatusCard />
      </div>
    </div>
  );
}
