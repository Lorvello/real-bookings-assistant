
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Calendar, CreditCard, MessageSquare, Wrench } from 'lucide-react';
import { ProfileTab } from './ProfileTab';
import { CalendarTab } from './CalendarTab';
import { ServicesTab } from './ServicesTab';
import { BillingTab } from './BillingTab';

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
    if (tabParam && ['profile', 'calendar', 'services', 'billing'].includes(tabParam)) {
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
          <h1 className="text-base md:text-3xl font-bold text-white mb-1 md:mb-2">Settings</h1>
          <p className="text-gray-400 text-xs md:text-base">Manage your settings</p>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3 md:space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 border-gray-700 min-w-max p-1 md:p-2 h-12 md:h-14">
              <TabsTrigger value="profile" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <User className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Beschikbaarheid</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <Wrench className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Services</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Billing</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile" className="space-y-4 md:space-y-6">
            <ProfileTab
              profileData={profileData}
              setProfileData={setProfileData}
              businessData={businessData}
              setBusinessData={setBusinessData}
              loading={loading}
              handleUpdateProfile={handleUpdateProfile}
              handleUpdateBusiness={handleUpdateBusiness}
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

        </Tabs>
      </div>
    </div>
  );
};
