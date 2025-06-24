
import React, { useState } from 'react';
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
    <div className="bg-gray-900 min-h-full p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">
            Manage your account and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5 bg-muted">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
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
      </div>
    </div>
  );
}
