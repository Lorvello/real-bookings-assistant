
import React from 'react';
import { UserManagement } from './UserManagement';
import { useSettingsContext } from '@/contexts/SettingsContext';

export const ProfileTab: React.FC = () => {
  const {
    profileData,
    setProfileData,
    businessData,
    setBusinessData,
    handleUpdateProfile,
    handleUpdateBusiness
  } = useSettingsContext();

  // No loading state - render immediately with cached data
  return (
    <div className="space-y-8">
      {/* The enhanced UserManagement component now handles both user management and profile information */}
      <UserManagement 
        externalBusinessData={businessData}
        externalProfileData={profileData}
        onBusinessDataChange={setBusinessData}
        onProfileDataChange={setProfileData}
        onUpdateBusiness={handleUpdateBusiness}
        onUpdateProfile={handleUpdateProfile}
        externalLoading={false}
      />
    </div>
  );
};
