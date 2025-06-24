
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileTab } from './ProfileTab';
import { BusinessTab } from './BusinessTab';
import { CalendarTab } from './CalendarTab';
import { WhatsAppTab } from './WhatsAppTab';
import { BillingTab } from './BillingTab';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsData } from '@/hooks/useSettingsData';
import { User, Building, Calendar, MessageCircle, CreditCard } from 'lucide-react';

export function SettingsLayout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Use the settings data hook to get all the data and handlers
  const {
    profileData,
    setProfileData,
    businessData,
    setBusinessData,
    calendarSettings,
    setCalendarSettings,
    whatsappSettings,
    setWhatsappSettings,
    loading,
    handleUpdateProfile
  } = useSettingsData();

  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Loading Settings...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-8">
        {/* Settings Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">
            Manage your account, business and integration settings
          </p>
        </div>

        {/* Settings Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Settings Tabs */}
          <TabsList className="grid w-full grid-cols-5 bg-gray-800 h-auto p-2">
            <TabsTrigger value="profile" className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg">
              <Building className="h-4 w-4" />
              Business
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* Tab Content with Clean Styling */}
          <TabsContent value="profile">
            <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
              <ProfileTab 
                profileData={profileData}
                setProfileData={setProfileData}
                loading={loading}
                handleUpdateProfile={handleUpdateProfile}
              />
            </div>
          </TabsContent>

          <TabsContent value="business">
            <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
              <BusinessTab 
                businessData={businessData}
                setBusinessData={setBusinessData}
                loading={loading}
                handleUpdateProfile={handleUpdateProfile}
              />
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
              <CalendarTab 
                calendarSettings={calendarSettings}
                setCalendarSettings={setCalendarSettings}
                loading={loading}
                handleUpdateProfile={handleUpdateProfile}
              />
            </div>
          </TabsContent>

          <TabsContent value="whatsapp">
            <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
              <WhatsAppTab 
                whatsappSettings={whatsappSettings}
                setWhatsappSettings={setWhatsappSettings}
              />
            </div>
          </TabsContent>

          <TabsContent value="billing">
            <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
              <BillingTab />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
