
import React, { useCallback, useState, useEffect } from 'react';
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

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profileData,
  setProfileData,
  loading,
  handleUpdateProfile
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeouts, setSaveTimeouts] = useState<{ profile?: NodeJS.Timeout }>({});

  // Auto-save profile data with debounce
  const autoSaveProfile = useCallback((newData: any) => {
    setProfileData(newData);
    
    if (saveTimeouts.profile) {
      clearTimeout(saveTimeouts.profile);
    }
    
    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        await handleUpdateProfile();
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    
    setSaveTimeouts(prev => ({ ...prev, profile: timeout }));
  }, [setProfileData, handleUpdateProfile, saveTimeouts.profile]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeouts).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [saveTimeouts]);

  return (
    <div className="space-y-8">
      {/* Auto-save indicator */}
      {(isSaving || loading) && (
        <div className="flex items-center justify-center bg-blue-800/90 border border-blue-700/50 rounded-2xl shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
            <p className="text-blue-200 text-sm">Saving...</p>
          </div>
        </div>
      )}

      {/* Users Management Section - Independent of calendar selection */}
      <UserManagement />

      {/* Basic Information */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Basic Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={profileData.full_name}
              onChange={(e) => autoSaveProfile({
                ...profileData,
                full_name: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => autoSaveProfile({
                ...profileData,
                email: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => autoSaveProfile({
                ...profileData,
                phone: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              value={profileData.date_of_birth}
              onChange={(e) => autoSaveProfile({
                ...profileData,
                date_of_birth: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Language
            </label>
            <select
              value={profileData.language}
              onChange={(e) => autoSaveProfile({
                ...profileData,
                language: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="nl">Dutch</option>
              <option value="en">English</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="tr">Turkish</option>
              <option value="ar">Arabic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Timezone
            </label>
            <select
              value={profileData.timezone}
              onChange={(e) => autoSaveProfile({
                ...profileData,
                timezone: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="Europe/Amsterdam">Amsterdam (CET)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="America/New_York">New York (EST)</option>
              <option value="America/Los_Angeles">Los Angeles (PST)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
