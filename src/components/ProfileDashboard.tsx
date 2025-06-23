
import React, { useState } from 'react';
import { Calendar, MessageCircle, BarChart3, Wrench } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useCalendars } from '@/hooks/useCalendars';
import { useProfile } from '@/hooks/useProfile';
import { ServiceTypesManager } from '@/components/ServiceTypesManager';
import { ProfileDashboardHeader } from '@/components/dashboard/ProfileDashboardHeader';
import { CalendarOverviewCards } from '@/components/dashboard/CalendarOverviewCards';
import { CalendarManagement } from '@/components/dashboard/CalendarManagement';
import { WhatsAppConfiguration } from '@/components/dashboard/WhatsAppConfiguration';
import { AnalyticsPlaceholder } from '@/components/dashboard/AnalyticsPlaceholder';
import { DashboardLayout } from '@/components/DashboardLayout';
import type { WhatsAppStatus } from '@/types/calendar';

export function ProfileDashboard() {
  const { user } = useAuth();
  const { calendars, loading: calendarsLoading } = useCalendars();
  const { profile, loading: profileLoading } = useProfile();
  const [whatsappStatus] = useState<WhatsAppStatus>({
    isConnected: true, // Mock data - replace with actual WhatsApp status
    lastSeen: new Date(),
    phoneNumber: '+31 6 12345678'
  });

  // Get the first active calendar for service types
  const activeCalendar = calendars.find(cal => cal.is_active) || calendars[0];

  if (calendarsLoading || profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-foreground">Loading dashboard...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProfileDashboardHeader 
          profileName={profile?.full_name} 
          whatsappStatus={whatsappStatus} 
        />

        {/* Main Dashboard Content */}
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Kalender
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Service Types
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

          <TabsContent value="calendar" className="space-y-6">
            <CalendarOverviewCards calendars={calendars} />
            <CalendarManagement calendars={calendars} />
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            {activeCalendar ? (
              <ServiceTypesManager calendarId={activeCalendar.id} />
            ) : (
              <Card className="border-border">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Active Calendar</h3>
                    <p className="text-muted-foreground mb-4">
                      Create or activate a calendar first to manage service types
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <WhatsAppConfiguration whatsappStatus={whatsappStatus} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsPlaceholder />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default ProfileDashboard;
