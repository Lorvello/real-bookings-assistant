
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarSettings } from '@/components/CalendarSettings';
import { useCalendars } from '@/hooks/useCalendars';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings as SettingsIcon, 
  Calendar, 
  MessageCircle, 
  Bell,
  CreditCard
} from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const { calendars, loading } = useCalendars();
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');

  React.useEffect(() => {
    if (calendars.length > 0 && !selectedCalendar) {
      setSelectedCalendar(calendars[0].id);
    }
  }, [calendars, selectedCalendar]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Loading settings...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 bg-gray-900 min-h-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <SettingsIcon className="h-8 w-8" />
            Instellingen
          </h1>
          <p className="text-gray-400">
            Beheer je account, kalender en WhatsApp instellingen
          </p>
        </div>

        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800">
            <TabsTrigger value="calendar" className="flex items-center gap-2 data-[state=active]:bg-green-600">
              <Calendar className="h-4 w-4" />
              Kalender
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2 data-[state=active]:bg-green-600">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2 data-[state=active]:bg-green-600">
              <SettingsIcon className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-green-600">
              <Bell className="h-4 w-4" />
              Notificaties
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2 data-[state=active]:bg-green-600">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            {calendars.length > 0 ? (
              <div className="space-y-6">
                {/* Calendar Selection */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Selecteer Kalender</CardTitle>
                    <CardDescription>
                      Kies welke kalender je wilt configureren
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {calendars.map((calendar) => (
                        <div
                          key={calendar.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedCalendar === calendar.id
                              ? 'border-green-600 bg-green-600/10'
                              : 'border-gray-600 hover:border-gray-500'
                          }`}
                          onClick={() => setSelectedCalendar(calendar.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-white">{calendar.name}</h3>
                              <p className="text-sm text-gray-400">/{calendar.slug}</p>
                            </div>
                            <Badge variant={calendar.is_active ? "default" : "secondary"}>
                              {calendar.is_active ? "Actief" : "Inactief"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Calendar Settings */}
                {selectedCalendar && (
                  <CalendarSettings calendarId={selectedCalendar} />
                )}
              </div>
            ) : (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Geen kalenders gevonden</h3>
                  <p className="text-gray-400">
                    Maak eerst een kalender aan om instellingen te kunnen configureren
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">WhatsApp Configuratie</CardTitle>
                <CardDescription>
                  Verbind en configureer je WhatsApp Business account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">WhatsApp integratie komt binnenkort</h3>
                  <p className="text-gray-400">
                    We werken aan de WhatsApp Business API integratie
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Account Instellingen</CardTitle>
                <CardDescription>
                  Beheer je persoonlijke account informatie
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-gray-700 border-gray-600 text-gray-300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name" className="text-gray-300">Volledige naam</Label>
                    <Input
                      id="name"
                      placeholder="Je volledige naam"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="business" className="text-gray-300">Bedrijfsnaam</Label>
                    <Input
                      id="business"
                      placeholder="Je bedrijfsnaam"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <Button className="bg-green-600 hover:bg-green-700">
                  Opslaan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Notificatie Instellingen</CardTitle>
                <CardDescription>
                  Configureer hoe en wanneer je notificaties ontvangt
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Email notificaties</Label>
                      <p className="text-sm text-gray-400">Ontvang emails voor nieuwe boekingen</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Push notificaties</Label>
                      <p className="text-sm text-gray-400">Ontvang push notificaties in je browser</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">WhatsApp notificaties</Label>
                      <p className="text-sm text-gray-400">Ontvang notificaties via WhatsApp</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Billing & Abonnement</CardTitle>
                <CardDescription>
                  Beheer je abonnement en betalingsinformatie
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Billing functionaliteit komt binnenkort</h3>
                  <p className="text-gray-400">
                    We werken aan een volledig billing systeem met abonnementen en facturatie
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
