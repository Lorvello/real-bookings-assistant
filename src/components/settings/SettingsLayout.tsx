
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Handle tab from URL parameters
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'business', 'calendar', 'services', 'billing', 'whatsapp'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Clear the URL parameter after navigating
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-gray-900 p-2 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-3 md:mb-8">
          <h1 className="text-base md:text-3xl font-bold text-white mb-1 md:mb-2">Instellingen</h1>
          <p className="text-gray-400 text-xs md:text-base">Beheer instellingen</p>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3 md:space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-6 bg-gray-800/50 border-gray-700 min-w-max p-1 md:p-2">
              <TabsTrigger value="profile" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <User className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Profiel</span>
              </TabsTrigger>
              <TabsTrigger value="business" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Bedrijf</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Kalender</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <Wrench className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Services</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Billing</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <MessageSquare className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">WhatsApp</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile" className="space-y-4 md:space-y-6">
            <ProfileTab
              profileData={profileData}
              setProfileData={setProfileData}
              loading={loading}
              handleUpdateProfile={handleUpdateProfile}
            />
          </TabsContent>

          <TabsContent value="business" className="space-y-4 md:space-y-6">
            <BusinessTab
              businessData={businessData}
              setBusinessData={setBusinessData}
              loading={loading}
              handleUpdateProfile={handleUpdateBusiness}
            />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4 md:space-y-6">
            <CalendarTab />
          </TabsContent>

          <TabsContent value="services" className="space-y-4 md:space-y-6">
            <ServicesTab />
          </TabsContent>

          <TabsContent value="billing" className="space-y-4 md:space-y-6">
            <BillingTab />
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4 md:space-y-6">
            <WhatsAppTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
