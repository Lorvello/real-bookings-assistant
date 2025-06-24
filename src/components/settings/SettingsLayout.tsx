
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Building2, Calendar, MessageCircle, CreditCard } from 'lucide-react';
import { ProfileTab } from './ProfileTab';
import { BusinessTab } from './BusinessTab';
import { CalendarTab } from './CalendarTab';
import { WhatsAppTab } from './WhatsAppTab';
import { BillingTab } from './BillingTab';
import { useSettingsData } from '@/hooks/useSettingsData';

export function SettingsLayout() {
  const [activeTab, setActiveTab] = useState('profile');
  
  const {
    profileData,
    setProfileData,
    businessData,
    setBusinessData,
    whatsappSettings,
    setWhatsappSettings,
    loading,
    handleUpdateProfile
  } = useSettingsData();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Instellingen</h1>
        <p className="text-muted-foreground mt-1">
          Beheer uw account en voorkeuren
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5 bg-muted">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profiel</span>
              </TabsTrigger>
              <TabsTrigger value="business" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Bedrijf</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Kalender</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Facturering</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <ProfileTab 
                profileData={profileData}
                setProfileData={setProfileData}
                loading={loading}
                handleUpdateProfile={handleUpdateProfile}
              />
            </TabsContent>

            <TabsContent value="business" className="space-y-6">
              <BusinessTab 
                businessData={businessData}
                setBusinessData={setBusinessData}
                loading={loading}
                handleUpdateProfile={handleUpdateProfile}
              />
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
              <CalendarTab />
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-6">
              <WhatsAppTab 
                whatsappSettings={whatsappSettings}
                setWhatsappSettings={setWhatsappSettings}
              />
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <BillingTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
