
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Building2, Calendar, CreditCard, MessageSquare } from 'lucide-react';
import { ProfileTab } from './ProfileTab';
import { BusinessTab } from './BusinessTab';
import { CalendarTab } from './CalendarTab';
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
          <TabsList className="grid w-full grid-cols-5 bg-gray-800/50 border-gray-700">
            <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-gray-700">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profiel</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2 data-[state=active]:bg-gray-700">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Bedrijf</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2 data-[state=active]:bg-gray-700">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Kalender</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2 data-[state=active]:bg-gray-700">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Facturering</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2 data-[state=active]:bg-gray-700">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
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
              handleUpdateProfile={handleUpdateBusiness}
            />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <CalendarTab />
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
