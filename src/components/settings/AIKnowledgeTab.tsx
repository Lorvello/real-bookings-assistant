
import React, { useCallback, useState, useEffect } from 'react';
import Select from 'react-select';
import { Info, Check, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { businessTypes } from '@/constants/settingsOptions';

interface AIKnowledgeTabProps {
  profileData: any;
  setProfileData: (data: any) => void;
  businessData: any;
  setBusinessData: (data: any) => void;
  loading: boolean;
  handleUpdateProfile: (customData?: any) => void;
  handleUpdateBusiness: (customData?: any) => void;
  refetch: () => Promise<void>;
}

export const AIKnowledgeTab: React.FC<AIKnowledgeTabProps> = ({
  profileData,
  setProfileData,
  businessData,
  setBusinessData,
  loading,
  handleUpdateProfile,
  handleUpdateBusiness,
  refetch
}) => {
  // Manual save state management
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<any>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Auto-save for business type dropdown only
  const autoSaveBusinessType = useCallback((newData: any) => {
    setBusinessData(newData);
    handleUpdateBusiness();
  }, [setBusinessData, handleUpdateBusiness]);

  // Manual save functions
  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    setTempValues({ [field]: currentValue });
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValues({});
  };

  const saveField = async (field: string) => {
    setSaving(field);
    
    try {
      if (field.startsWith('business_')) {
        // Update business data with the new value
        const newBusinessData = { ...businessData, [field]: tempValues[field] };
        setBusinessData(newBusinessData);
        
        // Save to database with the new data directly
        await handleUpdateBusiness(newBusinessData);
        
        // Refresh data from database to ensure UI shows exactly what was saved
        await refetch();
      } else {
        // Update profile data with the new value
        const newProfileData = { ...profileData, [field]: tempValues[field] };
        setProfileData(newProfileData);
        
        // Save to database with the new data directly
        await handleUpdateProfile(newProfileData);
        
        // Refresh data from database to ensure UI shows exactly what was saved
        await refetch();
      }
      
      setEditingField(null);
      setTempValues({});
    } catch (error) {
      console.error('Failed to save field:', error);
      // Reset temp values on error
      setTempValues({});
    } finally {
      setSaving(null);
    }
  };

  const renderEditableField = (
    field: string,
    label: string,
    currentValue: string,
    placeholder?: string,
    isTextarea?: boolean,
    rows?: number
  ) => {
    const isEditing = editingField === field;
    const isSaving = saving === field;
    
    if (isEditing) {
      return (
        <div className="flex items-start gap-2">
          {isTextarea ? (
            <textarea
              value={tempValues[field] || ''}
              onChange={(e) => setTempValues({ ...tempValues, [field]: e.target.value })}
              rows={rows || 3}
              className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder={placeholder}
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={tempValues[field] || ''}
              onChange={(e) => setTempValues({ ...tempValues, [field]: e.target.value })}
              className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder={placeholder}
              autoFocus
            />
          )}
          <div className="flex items-center gap-1 mt-1">
            <Button
              size="sm"
              onClick={() => saveField(field)}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={cancelEditing}
              className="border-gray-700 text-gray-300 hover:bg-gray-700 h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div 
        className="bg-gray-900 border border-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-800 transition-colors min-h-[44px] flex items-center"
        onClick={() => startEditing(field, currentValue || '')}
      >
        <span className={currentValue ? 'text-white' : 'text-gray-500'}>
          {currentValue || placeholder || 'Click to edit'}
        </span>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-8">
        {/* Save indicator */}
        {(saving || loading) && (
          <div className="flex items-center justify-center bg-blue-800/90 border border-blue-700/50 rounded-2xl shadow-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <p className="text-blue-200 text-sm">Saving...</p>
            </div>
          </div>
        )}

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
              {renderEditableField(
                'business_name',
                'Business Name',
                businessData.business_name,
                'Enter your business name'
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Business Type *
              </label>
              <Select 
                value={businessTypes.find(type => type.value === businessData.business_type)} 
                onChange={option => autoSaveBusinessType({
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
                  onChange={e => autoSaveBusinessType({
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
              {renderEditableField(
                'business_description',
                'Business Description',
                businessData.business_description,
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
                  {renderEditableField(
                    'business_street',
                    'Street Name',
                    businessData.business_street,
                    'Enter street name'
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    House Number
                  </label>
                  {renderEditableField(
                    'business_number',
                    'House Number',
                    businessData.business_number,
                    'Enter house number'
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Postal Code
                  </label>
                  {renderEditableField(
                    'business_postal',
                    'Postal Code',
                    businessData.business_postal,
                    'Enter postal code'
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City
                  </label>
                  {renderEditableField(
                    'business_city',
                    'City',
                    businessData.business_city,
                    'Enter city'
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country
                  </label>
                  {renderEditableField(
                    'business_country',
                    'Country',
                    businessData.business_country,
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
              {renderEditableField(
                'website',
                'Website',
                profileData.website,
                'https://www.example.com'
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Instagram
              </label>
              {renderEditableField(
                'instagram',
                'Instagram',
                profileData.instagram,
                '@username'
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Facebook
              </label>
              {renderEditableField(
                'facebook',
                'Facebook',
                profileData.facebook,
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
              {renderEditableField(
                'parking_info',
                'Parking Information',
                businessData.parking_info,
                'e.g. Free parking at the door, Paid parking in garage around the corner...',
                true,
                3
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Public Transport
              </label>
              {renderEditableField(
                'public_transport_info',
                'Public Transport',
                businessData.public_transport_info,
                'e.g. 5 minutes walk from station, Bus 12 stops at the door...',
                true,
                3
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Accessibility
              </label>
              {renderEditableField(
                'accessibility_info',
                'Accessibility',
                businessData.accessibility_info,
                'e.g. Wheelchair accessible, Elevator available, No thresholds...',
                true,
                3
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Other Information
              </label>
              {renderEditableField(
                'other_info',
                'Other Information',
                businessData.other_info,
                'Other information that may be useful for customers...',
                true,
                3
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
