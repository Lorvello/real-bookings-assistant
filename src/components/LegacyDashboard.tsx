
import React, { useState } from 'react';
import { Calendar, Wrench } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useCalendars } from '@/hooks/useCalendars';
import { useProfile } from '@/hooks/useProfile';
import { ServiceTypesManager } from '@/components/ServiceTypesManager';
import { CalendarOverviewCards } from '@/components/dashboard/CalendarOverviewCards';
import { CalendarManagement } from '@/components/dashboard/CalendarManagement';
import { DashboardLayout } from '@/components/DashboardLayout';

export function ProfileDashboard() {
  const { user } = useAuth();
  const { calendars, loading: calendarsLoading } = useCalendars();
  const { profile, loading: profileLoading } = useProfile();

  // Get the first active calendar for service types
  const activeCalendar = calendars.find(cal => cal.is_active) || calendars[0];

  if (calendarsLoading || profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Loading dashboard...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-8">
        {/* Profile Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
          </h1>
          <p className="text-gray-400 mt-1">
            Beheer je WhatsApp Booking Assistant
          </p>
        </div>

        {/* Main Dashboard Content */}
        <Tabs defaultValue="overzicht" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="overzicht" className="flex items-center gap-2 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600">
              <Calendar className="h-4 w-4" />
              Overzicht
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600">
              <Wrench className="h-4 w-4" />
              Service Types
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overzicht" className="space-y-6">
            <CalendarOverviewCards calendars={calendars} />
            <CalendarManagement calendars={calendars} />
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            {activeCalendar ? (
              <ServiceTypesManager calendarId={activeCalendar.id} />
            ) : (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Wrench className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Active Calendar</h3>
                    <p className="text-gray-400 mb-4">
                      Create or activate a calendar first to manage service types
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default ProfileDashboard;
