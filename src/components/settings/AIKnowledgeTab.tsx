import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { Info, AlertCircle, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { businessTypes } from '@/constants/settingsOptions';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { validateWebsite, validateSocial, SOCIAL_PLATFORMS } from '@/utils/socialValidation';

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
  const [isInitialized, setIsInitialized] = useState(false);
  const [socialErrors, setSocialErrors] = useState<{
    website?: string; instagram?: string; facebook?: string;
    linkedin?: string; tiktok?: string; youtube?: string; x?: string;
  }>({});

  // Sync local state when REAL server data is loaded (has id)
  useEffect(() => {
    if (profileData?.id) {
      setLocalProfileData(profileData);
      setIsInitialized(true);
    }
  }, [profileData?.id]);

  useEffect(() => {
    if (businessData) {
      setLocalBusinessData(businessData);
    }
  }, [businessData]);

  // Check if there are unsaved changes - only after data is initialized
  const hasUnsavedChanges = useMemo(() => {
    // Don't show unsaved changes until fully initialized
    if (!isInitialized) return false;
    if (!profileData || !businessData || !localProfileData || !localBusinessData) return false;
    
    const profileChanged = JSON.stringify(localProfileData) !== JSON.stringify(profileData);
    const businessChanged = JSON.stringify(localBusinessData) !== JSON.stringify(businessData);
    return profileChanged || businessChanged;
  }, [isInitialized, localProfileData, localBusinessData, profileData, businessData]);

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

  // Validate + canonicalize the website/social fields. Rejects random text and
  // normalizes valid input (e.g. "@handle" -> https://instagram.com/handle).
  const validateAndNormalizeProfile = () => {
    const w = validateWebsite(localProfileData?.website);
    const ig = validateSocial(SOCIAL_PLATFORMS.instagram, localProfileData?.instagram);
    const fb = validateSocial(SOCIAL_PLATFORMS.facebook, localProfileData?.facebook);
    const li = validateSocial(SOCIAL_PLATFORMS.linkedin, localProfileData?.linkedin);
    const tt = validateSocial(SOCIAL_PLATFORMS.tiktok, localProfileData?.tiktok);
    const yt = validateSocial(SOCIAL_PLATFORMS.youtube, localProfileData?.youtube);
    const x = validateSocial(SOCIAL_PLATFORMS.x, localProfileData?.x);
    const errors = {
      website: w.ok ? undefined : w.error,
      instagram: ig.ok ? undefined : ig.error,
      facebook: fb.ok ? undefined : fb.error,
      linkedin: li.ok ? undefined : li.error,
      tiktok: tt.ok ? undefined : tt.error,
      youtube: yt.ok ? undefined : yt.error,
      x: x.ok ? undefined : x.error,
    };
    const valid = w.ok && ig.ok && fb.ok && li.ok && tt.ok && yt.ok && x.ok;
    const normalized = valid
      ? {
          ...localProfileData,
          website: w.normalized, instagram: ig.normalized, facebook: fb.normalized,
          linkedin: li.normalized, tiktok: tt.normalized, youtube: yt.normalized, x: x.normalized,
        }
      : localProfileData;
    return { valid, errors, normalized };
  };

  // Save all changes
  const saveAllChanges = async () => {
    // Block saving invalid links; show inline errors.
    const { valid, errors, normalized } = validateAndNormalizeProfile();
    if (!valid) {
      setSocialErrors(errors);
      toast({
        title: "Check your links",
        description: "Some website or social fields aren't valid. Fix the highlighted fields.",
        variant: "destructive",
      });
      return;
    }
    setSocialErrors({});
    setLocalProfileData(normalized); // reflect canonicalized values in the UI
    setIsSaving(true);

    try {
      const success = await handleBatchUpdate(normalized, localBusinessData);

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

  // Website/social input with onBlur validation + inline error (rejects random text).
  const renderValidatedField = (
    field: 'website' | 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x',
    value: string,
    placeholder: string,
    validate: (v: string) => { ok: boolean; error?: string }
  ) => {
    const err = socialErrors[field];
    return (
      <>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => {
            updateProfileField(field, e.target.value);
            if (err) setSocialErrors(prev => ({ ...prev, [field]: undefined }));
          }}
          onBlur={(e) => {
            const r = validate(e.target.value);
            setSocialErrors(prev => ({ ...prev, [field]: r.ok ? undefined : r.error }));
          }}
          className={`w-full px-4 py-2 bg-gray-900 border rounded-lg text-white focus:ring-2 focus:border-transparent transition-colors ${err ? 'border-red-500 focus:ring-red-600' : 'border-gray-700 focus:ring-green-600'}`}
          placeholder={placeholder}
        />
        {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
      </>
    );
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

          {/* Make the setup requirement unmistakable: only name + type are needed to
              finish onboarding; everything else here is optional. */}
          {(() => {
            const hasName = !!localBusinessData?.business_name?.trim();
            const hasType = !!localBusinessData?.business_type;
            const missing = [!hasName && 'Business Name', !hasType && 'Business Type'].filter(Boolean) as string[];
            return missing.length > 0 ? (
              <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-200">
                  <span className="font-medium">Required to finish setup:</span> {missing.join(' + ')}. Everything else on this page is optional.
                </p>
              </div>
            ) : (
              <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3">
                <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                <p className="text-sm text-green-200">Required business info complete — the other fields below are optional.</p>
              </div>
            );
          })()}

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
                <h3 className="text-lg font-medium text-white">Address Details <span className="text-sm font-normal text-gray-500">(optional)</span></h3>
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
            <h2 className="text-xl font-semibold text-white">Social Media & Website <span className="text-sm font-normal text-gray-500">(optional)</span></h2>
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
              {renderValidatedField(
                'website',
                localProfileData.website,
                'www.example.com',
                (v) => validateWebsite(v)
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Instagram
              </label>
              {renderValidatedField(
                'instagram',
                localProfileData.instagram,
                '@yourhandle',
                (v) => validateSocial(SOCIAL_PLATFORMS.instagram, v)
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Facebook
              </label>
              {renderValidatedField(
                'facebook',
                localProfileData.facebook,
                'facebook.com/yourpage',
                (v) => validateSocial(SOCIAL_PLATFORMS.facebook, v)
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                LinkedIn
              </label>
              {renderValidatedField(
                'linkedin',
                localProfileData.linkedin,
                'linkedin.com/company/yourco',
                (v) => validateSocial(SOCIAL_PLATFORMS.linkedin, v)
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                TikTok
              </label>
              {renderValidatedField(
                'tiktok',
                localProfileData.tiktok,
                '@yourhandle',
                (v) => validateSocial(SOCIAL_PLATFORMS.tiktok, v)
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                YouTube
              </label>
              {renderValidatedField(
                'youtube',
                localProfileData.youtube,
                'youtube.com/@yourchannel',
                (v) => validateSocial(SOCIAL_PLATFORMS.youtube, v)
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                X (Twitter)
              </label>
              {renderValidatedField(
                'x',
                localProfileData.x,
                '@yourhandle',
                (v) => validateSocial(SOCIAL_PLATFORMS.x, v)
              )}
            </div>
          </div>
        </div>

        {/* Business Knowledge Base */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-semibold text-white">Booking Agent Knowledge Base <span className="text-sm font-normal text-gray-500">(optional)</span></h2>
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
          <p className="text-sm text-gray-400 mb-6">The more you fill in here, the better the AI agent can answer customer questions on WhatsApp without you. Leave a field blank and the agent simply won't claim to know it.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cancellation &amp; Reschedule Policy
              </label>
              {renderInputField(
                'cancellation_policy',
                localBusinessData.cancellation_policy,
                (value) => updateBusinessField('cancellation_policy', value),
                'e.g. Free cancellation up to 24h before; later cancellations or no-shows are charged 50%. Rescheduling is free anytime.',
                true,
                3
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment &amp; Deposit
              </label>
              {renderInputField(
                'payment_info',
                localBusinessData.payment_info,
                (value) => updateBusinessField('payment_info', value),
                'e.g. Pay in the salon by card or cash; a 20% deposit is required to confirm appointments over €100.',
                true,
                3
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                How to Prepare / What to Bring
              </label>
              {renderInputField(
                'preparation_info',
                localBusinessData.preparation_info,
                (value) => updateBusinessField('preparation_info', value),
                'e.g. Come with clean, dry hair. Bring any reference photos. Arrive 5 minutes early.',
                true,
                3
              )}
            </div>

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
