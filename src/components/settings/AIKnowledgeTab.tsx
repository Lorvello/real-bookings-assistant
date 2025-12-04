import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { Info, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { businessTypes } from '@/constants/settingsOptions';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';

export const AIKnowledgeTab: React.FC = () => {
  const {
    profileData,
    businessData,
    handleBatchUpdate,
    refetch
  } = useSettingsContext();
  
  const { toast } = useToast();
  
  // Local state for pending changes (buffered)
  const [localProfileData, setLocalProfileData] = useState(profileData);
  const [localBusinessData, setLocalBusinessData] = useState(businessData);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when data is fetched from server
  useEffect(() => {
    setLocalProfileData(profileData);
  }, [profileData]);

  useEffect(() => {
    setLocalBusinessData(businessData);
  }, [businessData]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    const profileChanged = JSON.stringify(localProfileData) !== JSON.stringify(profileData);
    const businessChanged = JSON.stringify(localBusinessData) !== JSON.stringify(businessData);
    return profileChanged || businessChanged;
  }, [localProfileData, localBusinessData, profileData, businessData]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Save all changes
  const saveAllChanges = async () => {
    setIsSaving(true);
    
    try {
      const success = await handleBatchUpdate(localProfileData, localBusinessData);
      
      if (success) {
        await refetch();
        toast({
          title: "Changes Saved",
          description: "All your settings have been saved successfully.",
        });
      }
    } catch (error) {
      console.error('Failed to save changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Discard all changes
  const discardChanges = () => {
    setLocalProfileData(profileData);
    setLocalBusinessData(businessData);
  };

  // Update handlers for local state
  const updateBusinessField = (field: string, value: string) => {
    setLocalBusinessData(prev => ({ ...prev, [field]: value }));
  };

  const updateProfileField = (field: string, value: string) => {
    setLocalProfileData(prev => ({ ...prev, [field]: value }));
  };

  // Render input field
  const renderInputField = (
    field: string,
    value: string,
    onChange: (value: string) => void,
    placeholder?: string,
    isTextarea?: boolean,
    rows?: number
  ) => {
    if (isTextarea) {
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={rows || 3}
          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent transition-colors"
          placeholder={placeholder}
        />
      );
    }

    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent transition-colors"
        placeholder={placeholder}
      />
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-8 pb-24">
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
              {renderInputField(
                'business_name',
                localBusinessData.business_name,
                (value) => updateBusinessField('business_name', value),
                'Enter your business name'
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Business Type *
              </label>
              <Select 
                value={businessTypes.find(type => type.value === localBusinessData.business_type)} 
                onChange={option => updateBusinessField('business_type', option?.value || '')}
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
              
              {localBusinessData.business_type === 'other' && (
                <input 
                  type="text" 
                  value={localBusinessData.business_type_other || ''} 
                  onChange={e => updateBusinessField('business_type_other', e.target.value)}
                  placeholder="Specify business type..." 
                  className="mt-2 w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Business Description
              </label>
              {renderInputField(
                'business_description',
                localBusinessData.business_description,
                (value) => updateBusinessField('business_description', value),
                'Tell customers about your business...',
                true,
                4
              )}
            </div>
            
            {/* Address Section within Business Information */}
            <div className="pt-6 border-t border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-medium text-white">Address Details</h3>
                <span className="text-xs text-gray-500">optional</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Street Name
                  </label>
                  {renderInputField(
                    'business_street',
                    localBusinessData.business_street,
                    (value) => updateBusinessField('business_street', value),
                    'Enter street name'
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    House Number
                  </label>
                  {renderInputField(
                    'business_number',
                    localBusinessData.business_number,
                    (value) => updateBusinessField('business_number', value),
                    'Enter house number'
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Postal Code
                  </label>
                  {renderInputField(
                    'business_postal',
                    localBusinessData.business_postal,
                    (value) => updateBusinessField('business_postal', value),
                    'Enter postal code'
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City
                  </label>
                  {renderInputField(
                    'business_city',
                    localBusinessData.business_city,
                    (value) => updateBusinessField('business_city', value),
                    'Enter city'
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country
                  </label>
                  {renderInputField(
                    'business_country',
                    localBusinessData.business_country,
                    (value) => updateBusinessField('business_country', value),
                    'Enter country'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-semibold text-white">Social Media & Website</h2>
            <span className="text-xs text-gray-500">optional</span>
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
              {renderInputField(
                'website',
                localProfileData.website,
                (value) => updateProfileField('website', value),
                'https://www.example.com'
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Instagram
              </label>
              {renderInputField(
                'instagram',
                localProfileData.instagram,
                (value) => updateProfileField('instagram', value),
                '@username'
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Facebook
              </label>
              {renderInputField(
                'facebook',
                localProfileData.facebook,
                (value) => updateProfileField('facebook', value),
                'facebook.com/pagename'
              )}
            </div>
          </div>
        </div>

        {/* Business Knowledge Base */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-semibold text-white">Booking Agent Knowledge Base</h2>
            <span className="text-xs text-gray-500">optional</span>
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
              {renderInputField(
                'parking_info',
                localBusinessData.parking_info,
                (value) => updateBusinessField('parking_info', value),
                'e.g. Free parking at the door, Paid parking in garage around the corner...',
                true,
                3
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Public Transport
              </label>
              {renderInputField(
                'public_transport_info',
                localBusinessData.public_transport_info,
                (value) => updateBusinessField('public_transport_info', value),
                'e.g. 5 minutes walk from station, Bus 12 stops at the door...',
                true,
                3
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Accessibility
              </label>
              {renderInputField(
                'accessibility_info',
                localBusinessData.accessibility_info,
                (value) => updateBusinessField('accessibility_info', value),
                'e.g. Wheelchair accessible, Elevator available, No thresholds...',
                true,
                3
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Other Information
              </label>
              {renderInputField(
                'other_info',
                localBusinessData.other_info,
                (value) => updateBusinessField('other_info', value),
                'Other information that may be useful for customers...',
                true,
                3
              )}
            </div>
          </div>
        </div>

        {/* Sticky Save Bar */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-50 shadow-lg">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
              <span className="text-amber-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                You have unsaved changes
              </span>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={discardChanges}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Discard
                </Button>
                <Button 
                  onClick={saveAllChanges} 
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
