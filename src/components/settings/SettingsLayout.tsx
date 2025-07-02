
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Building2, Calendar, CreditCard, MessageSquare, Wrench } from 'lucide-react';
import { ProfileTab } from './ProfileTab';
import { BusinessTab } from './BusinessTab';
import { CalendarTab } from './CalendarTab';
import { ServicesTab } from './ServicesTab';
import { BillingTab } from './BillingTab';
import { WhatsAppTab } from './WhatsAppTab';
import { useSettingsData } from '@/hooks/useSettingsData';

export const SettingsLayout = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const {
    profileData,
    setProfileData,
    businessData,
    setBusinessData,
    loading,
    handleUpdateProfile,
    handleUpdateBusiness
  } = useSettingsData();

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Instellingen</h1>
          <p className="text-gray-400">Beheer je profiel, bedrijf en kalenderinstellingen</p>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-6 bg-gray-800/50 border-gray-700 min-w-max">
              <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4">
                <User className="h-4 w-4" />
                <span className="hidden md:inline">Profiel</span>
              </TabsTrigger>
              <TabsTrigger value="business" className="flex items-center gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4">
                <Building2 className="h-4 w-4" />
                <span className="hidden md:inline">Bedrijf</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4">
                <Calendar className="h-4 w-4" />
                <span className="hidden md:inline">Kalender</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4">
                <Wrench className="h-4 w-4" />
                <span className="hidden md:inline">Services</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4">
                <CreditCard className="h-4 w-4" />
                <span className="hidden md:inline">Facturering</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden md:inline">WhatsApp</span>
              </TabsTrigger>
            </TabsList>
          </div>

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
              handleUpdateProfile={handleUpdateBusiness}
            />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <CalendarTab />
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <ServicesTab />
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <BillingTab />
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <WhatsAppTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
