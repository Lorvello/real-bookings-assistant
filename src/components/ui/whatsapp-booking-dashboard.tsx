
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CalendarContainer } from '@/components/calendar/CalendarContainer';
import { RealtimeDashboard } from '@/components/RealtimeDashboard';
import { TodaysScheduleCard } from '@/components/dashboard/TodaysScheduleCard';
import { AiBotStatusCard } from '@/components/dashboard/AiBotStatusCard';
import { WhatsAppDashboard } from '@/components/whatsapp/WhatsAppDashboard';
import { OptimizedAnalyticsDashboard } from '@/components/OptimizedAnalyticsDashboard';
import { useConversationCalendar } from '@/contexts/ConversationCalendarContext';
import { useCalendars } from '@/hooks/useCalendars';
import { Calendar, MessageCircle, BarChart3, Settings, Plus } from 'lucide-react';

export default function WhatsAppBookingDashboard() {
  const { selectedCalendarId } = useConversationCalendar();
  const { calendars } = useCalendars();
  const [activeTab, setActiveTab] = useState('overview');

  const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
  const currentCalendarId = selectedCalendarId || defaultCalendar?.id;

  if (!currentCalendarId) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Geen kalender gevonden</h3>
            <p className="text-muted-foreground mb-4">
              Maak eerst een kalender aan om te beginnen.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Kalender aanmaken
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Booking Dashboard</h1>
          <p className="text-muted-foreground">
            Beheer je afspraken, WhatsApp conversaties en analytics in real-time
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overzicht
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Kalender
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Real-time dashboard metrics */}
          <RealtimeDashboard calendarId={currentCalendarId} />
          
          {/* Today's activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TodaysScheduleCard />
            <AiBotStatusCard />
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <CalendarContainer calendarId={currentCalendarId} />
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <WhatsAppDashboard calendarId={currentCalendarId} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <OptimizedAnalyticsDashboard calendarId={currentCalendarId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
