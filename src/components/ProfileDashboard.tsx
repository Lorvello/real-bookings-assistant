
import React, { useEffect, useState } from 'react';
import { Calendar, Plus, Settings, MessageCircle, BarChart3, Clock, Users, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useCalendars } from '@/hooks/useCalendars';
import { useProfile } from '@/hooks/useProfile';
import type { Calendar as CalendarType, WhatsAppStatus } from '@/types/calendar';

export function ProfileDashboard() {
  const { user } = useAuth();
  const { calendars, loading: calendarsLoading } = useCalendars();
  const { profile, loading: profileLoading } = useProfile();
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>({
    isConnected: true, // Mock data - replace with actual WhatsApp status
    lastSeen: new Date(),
    phoneNumber: '+31 6 12345678'
  });

  if (calendarsLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-foreground">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header met WhatsApp status indicator */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold text-foreground">
                  Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
                </CardTitle>
                <CardDescription className="mt-1 text-muted-foreground">
                  Beheer je WhatsApp Booking Assistant
                </CardDescription>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${whatsappStatus.isConnected ? 'bg-whatsapp animate-pulse' : 'bg-destructive'}`}></div>
                  <span className={`text-sm font-medium ${whatsappStatus.isConnected ? 'text-whatsapp' : 'text-destructive'}`}>
                    {whatsappStatus.isConnected ? 'WhatsApp Actief' : 'WhatsApp Offline'}
                  </span>
                </div>
                {whatsappStatus.phoneNumber && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {whatsappStatus.phoneNumber}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Dashboard Content */}
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-card">
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

          <TabsContent value="calendar" className="space-y-6">
            {/* Calendar Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Calendars
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {calendars.filter(cal => cal.is_active).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {calendars.length} total calendars
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Today's Bookings
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">12</div>
                  <p className="text-xs text-muted-foreground">
                    3 pending confirmations
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Customers
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">247</div>
                  <p className="text-xs text-muted-foreground">
                    +12% from last month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Calendar Management */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Your Calendars</CardTitle>
                    <CardDescription>
                      Manage your booking calendars and settings
                    </CardDescription>
                  </div>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    New Calendar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {calendars.length > 0 ? (
                  <div className="space-y-4">
                    {calendars.map((calendar) => (
                      <div key={calendar.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-background-secondary">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                              <Calendar className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">{calendar.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Booking URL: /{calendar.slug}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Timezone: {calendar.timezone}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={calendar.is_active ? "default" : "secondary"}>
                            {calendar.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No calendars yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first calendar to start accepting bookings
                    </p>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Calendar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-foreground">WhatsApp Configuration</CardTitle>
                <CardDescription>
                  Connect and configure your WhatsApp Business account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-whatsapp/20 rounded-lg flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-whatsapp" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">WhatsApp Business</h3>
                      <p className="text-sm text-muted-foreground">
                        {whatsappStatus.isConnected ? 'Connected and active' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={whatsappStatus.isConnected ? "default" : "destructive"}>
                    {whatsappStatus.isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                
                {!whatsappStatus.isConnected && (
                  <Button className="w-full bg-whatsapp hover:bg-whatsapp/90 text-white">
                    Connect WhatsApp Business
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Analytics Dashboard</CardTitle>
                <CardDescription>
                  Track your booking performance and customer insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Analytics Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Detailed analytics and reporting features will be available soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default ProfileDashboard;
