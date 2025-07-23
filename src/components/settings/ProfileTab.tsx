
import React, { useCallback, useState, useEffect } from 'react';
import Select from 'react-select';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { businessTypes } from '@/constants/settingsOptions';
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
  businessData,
  setBusinessData,
  loading,
  handleUpdateProfile,
  handleUpdateBusiness
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeouts, setSaveTimeouts] = useState<{ profile?: NodeJS.Timeout; business?: NodeJS.Timeout }>({});

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

  // Auto-save business data with debounce
  const autoSaveBusiness = useCallback((newData: any) => {
    setBusinessData(newData);
    
    if (saveTimeouts.business) {
      clearTimeout(saveTimeouts.business);
    }
    
    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        await handleUpdateBusiness();
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    
    setSaveTimeouts(prev => ({ ...prev, business: timeout }));
  }, [setBusinessData, handleUpdateBusiness, saveTimeouts.business]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeouts).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [saveTimeouts]);

  return (
    <TooltipProvider delayDuration={100}>
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

      {/* Users Management Section */}
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


      {/* Social Media */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-xl font-semibold text-white">Social Media & Website</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="h-4 w-4 text-gray-400 hover:text-white transition-colors">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>The AI agent can use this information in its messages</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Website
            </label>
            <input
              type="url"
              value={profileData.website}
              onChange={(e) => autoSaveProfile({
                ...profileData,
                website: e.target.value
              })}
              placeholder="https://www.example.com"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Instagram
            </label>
            <input
              type="text"
              value={profileData.instagram}
              onChange={(e) => autoSaveProfile({
                ...profileData,
                instagram: e.target.value
              })}
              placeholder="@username"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Facebook
            </label>
            <input
              type="text"
              value={profileData.facebook}
              onChange={(e) => autoSaveProfile({
                ...profileData,
                facebook: e.target.value
              })}
              placeholder="facebook.com/pagename"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Business Information with Address */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-xl font-semibold text-white">Business Information</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="h-4 w-4 text-gray-400 hover:text-white transition-colors">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>The AI agent can use this information in its messages</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Name *
            </label>
            <input 
              type="text" 
              value={businessData.business_name} 
              onChange={e => autoSaveBusiness({
                ...businessData,
                business_name: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Type *
            </label>
            <Select 
              value={businessTypes.find(type => type.value === businessData.business_type)} 
              onChange={option => autoSaveBusiness({
                ...businessData,
                business_type: option?.value || ''
              })}
              options={businessTypes} 
              className="react-select-container" 
              classNamePrefix="react-select" 
              placeholder="Search and select business type..." 
              isSearchable 
              styles={{
                control: base => ({
                  ...base,
                  backgroundColor: '#111827',
                  borderColor: '#374151',
                  '&:hover': {
                    borderColor: '#10B981'
                  }
                }),
                menu: base => ({
                  ...base,
                  backgroundColor: '#111827'
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? '#10B981' : state.isFocused ? '#1F2937' : '#111827',
                  color: 'white'
                }),
                singleValue: base => ({
                  ...base,
                  color: 'white'
                }),
                input: base => ({
                  ...base,
                  color: 'white'
                })
              }} 
            />
            
            {businessData.business_type === 'other' && (
              <input 
                type="text" 
                value={businessData.business_type_other} 
                onChange={e => autoSaveBusiness({
                  ...businessData,
                  business_type_other: e.target.value
                })}
                placeholder="Specify business type..." 
                className="mt-2 w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Description
            </label>
            <textarea 
              value={businessData.business_description} 
              onChange={e => autoSaveBusiness({
                ...businessData,
                business_description: e.target.value
              })}
              rows={4} 
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              placeholder="Tell customers about your business..." 
            />
          </div>
          
          {/* Address Section within Business Information */}
          <div className="pt-6 border-t border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">Address Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Street Name
                </label>
                <input
                  type="text"
                  value={businessData.business_street}
                  onChange={(e) => autoSaveBusiness({
                    ...businessData,
                    business_street: e.target.value
                  })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  House Number
                </label>
                <input
                  type="text"
                  value={businessData.business_number}
                  onChange={(e) => autoSaveBusiness({
                    ...businessData,
                    business_number: e.target.value
                  })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={businessData.business_postal}
                  onChange={(e) => autoSaveBusiness({
                    ...businessData,
                    business_postal: e.target.value
                  })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={businessData.business_city}
                  onChange={(e) => autoSaveBusiness({
                    ...businessData,
                    business_city: e.target.value
                  })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={businessData.business_country}
                  onChange={(e) => autoSaveBusiness({
                    ...businessData,
                    business_country: e.target.value
                  })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Knowledge Base */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-xl font-semibold text-white">Booking Agent Knowledge Base</h2>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-gray-400 hover:text-white transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p>The AI agent can use this information in its messages</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-sm text-gray-400 mb-6">This information is used by the AI booking agent to help customers with questions</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Parking Information
            </label>
            <textarea 
              value={businessData.parking_info} 
              onChange={e => autoSaveBusiness({
                ...businessData,
                parking_info: e.target.value
              })}
              rows={3} 
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              placeholder="e.g. Free parking at the door, Paid parking in garage around the corner..." 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Public Transport
            </label>
            <textarea 
              value={businessData.public_transport_info} 
              onChange={e => autoSaveBusiness({
                ...businessData,
                public_transport_info: e.target.value
              })}
              rows={3} 
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              placeholder="e.g. 5 minutes walk from station, Bus 12 stops at the door..." 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Accessibility
            </label>
            <textarea 
              value={businessData.accessibility_info} 
              onChange={e => autoSaveBusiness({
                ...businessData,
                accessibility_info: e.target.value
              })}
              rows={3} 
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              placeholder="e.g. Wheelchair accessible, Elevator available, No thresholds..." 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Other Information
            </label>
            <textarea 
              value={businessData.other_info} 
              onChange={e => autoSaveBusiness({
                ...businessData,
                other_info: e.target.value
              })}
              rows={3} 
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              placeholder="Other information that may be useful for customers..." 
            />
          </div>
        </div>
      </div>
      </div>
    </TooltipProvider>
  );
};
