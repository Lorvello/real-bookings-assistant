
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
    isConnected: true,
    lastSeen: new Date(),
    phoneNumber: '+31 6 12345678'
  });

  // Get the first active calendar for service types
  const activeCalendar = calendars.find(cal => cal.is_active) || calendars[0];

  if (calendarsLoading || profileLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-900 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Beheer je WhatsApp Booking Assistant</p>
        </div>

        {/* Main Dashboard Content */}
        <div className="max-w-4xl">
          <Tabs defaultValue="calendar" className="space-y-6">
            <div className="border-b border-gray-700 mb-8">
              <nav className="-mb-px flex space-x-8">
                <TabsTrigger 
                  value="calendar" 
                  className="py-2 px-1 border-b-2 font-medium text-sm data-[state=active]:border-green-600 data-[state=active]:text-green-600 border-transparent text-gray-400 hover:text-white hover:border-gray-300"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Kalender
                </TabsTrigger>
                <TabsTrigger 
                  value="services" 
                  className="py-2 px-1 border-b-2 font-medium text-sm data-[state=active]:border-green-600 data-[state=active]:text-green-600 border-transparent text-gray-400 hover:text-white hover:border-gray-300"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Service Types
                </TabsTrigger>
                <TabsTrigger 
                  value="whatsapp" 
                  className="py-2 px-1 border-b-2 font-medium text-sm data-[state=active]:border-green-600 data-[state=active]:text-green-600 border-transparent text-gray-400 hover:text-white hover:border-gray-300"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="py-2 px-1 border-b-2 font-medium text-sm data-[state=active]:border-green-600 data-[state=active]:text-green-600 border-transparent text-gray-400 hover:text-white hover:border-gray-300"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </nav>
            </div>

            <TabsContent value="calendar" className="space-y-6">
              <CalendarOverviewCards calendars={calendars} />
              <CalendarManagement calendars={calendars} />
            </TabsContent>

            <TabsContent value="services" className="space-y-6">
              {activeCalendar ? (
                <ServiceTypesManager calendarId={activeCalendar.id} />
              ) : (
                <Card className="border-gray-700 bg-gray-800">
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No Active Calendar</h3>
                      <p className="text-gray-400 mb-4">
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
      </div>
    </DashboardLayout>
  );
}

export default ProfileDashboard;
