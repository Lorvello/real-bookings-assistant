
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSettingsData } from '@/hooks/useSettingsData';
import { ProfileTab } from './ProfileTab';
import { BusinessTab } from './BusinessTab';
import { WhatsAppTab } from './WhatsAppTab';
import { BillingTab } from './BillingTab';

export const SettingsLayout = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Loading...</div>
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
      <div className="min-h-screen bg-gray-900 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Instellingen</h1>
          <p className="text-gray-400 mt-1">Beheer je account en bedrijfsinstellingen</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {['profile', 'business', 'whatsapp', 'billing'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                }`}
              >
                {tab === 'whatsapp' ? 'WhatsApp Custom Branding' : 
                 tab === 'business' ? 'Bedrijf' : 
                 tab === 'billing' ? 'Billing' :
                 'Profiel'}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="max-w-4xl">
          {activeTab === 'profile' && (
            <ProfileTab
              profileData={profileData}
              setProfileData={setProfileData}
              loading={loading}
              handleUpdateProfile={handleUpdateProfile}
            />
          )}
          {activeTab === 'business' && (
            <BusinessTab
              businessData={businessData}
              setBusinessData={setBusinessData}
              loading={loading}
              handleUpdateProfile={handleUpdateProfile}
            />
          )}
          {activeTab === 'whatsapp' && (
            <WhatsAppTab
              whatsappSettings={whatsappSettings}
              setWhatsappSettings={setWhatsappSettings}
            />
          )}
          {activeTab === 'billing' && <BillingTab />}
        </div>
      </div>
    </DashboardLayout>
  );
};
