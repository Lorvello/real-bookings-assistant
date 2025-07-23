
import React from 'react';
import { UserManagement } from './UserManagement';

interface ProfileTabProps {
  profileData: any;
  setProfileData: (data: any) => void;
  businessData: any;
  setBusinessData: (data: any) => void;
  loading: boolean;
  handleUpdateProfile: () => void;
  handleUpdateBusiness: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = () => {
  return (
    <div className="space-y-8">
      {/* The enhanced UserManagement component now handles both user management and profile information */}
      <UserManagement />
    </div>
  );
};
