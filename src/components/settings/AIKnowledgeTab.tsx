import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { Info, AlertCircle, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { businessTypes } from '@/constants/settingsOptions';
import { PLATFORM_WHATSAPP_DISPLAY, PLATFORM_WHATSAPP_LABEL } from '@/constants/platform';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { validateWebsite } from '@/utils/socialValidation';
import { SettingsSection } from './SettingsSection';

export const AIKnowledgeTab: React.FC = () => {
  const {
    profileData,
    businessData,
    saveFields,
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

  // The website/link fields this tab owns, each with its validator. Reduced to
  // Website only (the 5 social platforms were orphan fields, now removed).
  const SOCIAL_FIELDS: Array<{
    key: 'website' | 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x';
    validate: (v: string) => { ok: boolean; normalized: string; error?: string };
  }> = [
    { key: 'website', validate: (v) => validateWebsite(v) },
  ];

  // The business fields this tab owns (everything it can edit on this page).
  // business_whatsapp is intentionally absent: it is now a read-only platform
  // display, not an editable/saved field.
  const BUSINESS_FIELDS = [
    'business_name', 'business_type', 'business_type_other',
    'business_phone', 'business_email',
    'business_street', 'business_number', 'business_postal', 'business_city', 'business_country',
    'business_description',
    'cancellation_policy', 'payment_info', 'preparation_info',
    'parking_info', 'public_transport_info', 'accessibility_info', 'other_info',
  ];

  // Save all changes — PARTIAL save. Only the fields THIS tab changed are written, so
  // a save here can never clobber the Profile tab's fields. A single invalid link no
  // longer blocks the whole page: the bad field is flagged inline and skipped; every
  // other changed field still saves.
  const saveAllChanges = async () => {
    const changes: Record<string, any> = {};

    // 1) Changed business fields (diff local vs server snapshot).
    for (const k of BUSINESS_FIELDS) {
      const localVal = (localBusinessData as any)?.[k] ?? '';
      const serverVal = (businessData as any)?.[k] ?? '';
      if (localVal !== serverVal) changes[k] = localVal;
    }

    // 2) Website/socials: validate per field. Valid + changed -> include (canonicalized).
    //    Invalid -> flag inline, skip (don't block the rest). Track for the toast.
    const nextErrors: typeof socialErrors = {};
    const normalizedUpdates: Record<string, string> = {};
    let skippedInvalid = 0;
    for (const { key, validate } of SOCIAL_FIELDS) {
      const raw = (localProfileData as any)?.[key] ?? '';
      const r = validate(raw);
      if (!r.ok) {
        nextErrors[key] = r.error;
        skippedInvalid++;
        continue;
      }
      normalizedUpdates[key] = r.normalized;
      const serverVal = (profileData as any)?.[key] ?? '';
      if (r.normalized !== serverVal) changes[key] = r.normalized;
    }
    setSocialErrors(nextErrors);

    // Reflect canonicalized values for the valid fields in the UI immediately.
    if (Object.keys(normalizedUpdates).length > 0) {
      setLocalProfileData((prev: any) => ({ ...prev, ...normalizedUpdates }));
    }

    if (Object.keys(changes).length === 0) {
      if (skippedInvalid > 0) {
        toast({
          title: 'Check your links',
          description: 'Fix the highlighted website or social fields, then save.',
          variant: 'destructive',
        });
      }
      return;
    }

    setIsSaving(true);
    try {
      const success = await saveFields(changes);
      if (success) {
        await refetch();
        toast({
          title: skippedInvalid > 0 ? 'Saved (some links skipped)' : 'Changes saved',
          description: skippedInvalid > 0
            ? 'Your changes were saved. The highlighted link fields were not, fix and save them again.'
            : 'All your settings have been saved successfully.',
          variant: skippedInvalid > 0 ? 'default' : undefined,
        });
      }
    } catch (error) {
      console.error('Failed to save changes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
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
          className={`w-full px-4 py-2 bg-background border rounded-lg text-foreground focus:ring-2 focus:border-transparent transition-colors ${err ? 'border-destructive focus:ring-destructive' : 'border-border focus:ring-primary'}`}
          placeholder={placeholder}
        />
        {err && <p className="mt-1 text-xs text-destructive-foreground">{err}</p>}
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
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          placeholder={placeholder}
        />
      );
    }

    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
        placeholder={placeholder}
      />
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-8 pb-24">
        {/* Plain-language explainer so the owner understands what the agent does
            with this page (no system-prompt / no doctrine exposed). */}
        <div className="rounded-lg border border-primary/20 bg-primary/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm font-medium text-foreground">How your assistant uses this page</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything you fill in here is what your WhatsApp assistant can tell customers, in your name. It shares your contact details, address, website and opening hours on request, and answers questions from your knowledge base. Leave a field blank and the agent simply won't claim to know it.
          </p>
        </div>

        {/* Identity + Contact + Address */}
        <SettingsSection
          title="Business Information"
          description="Your assistant uses these to introduce itself and to answer 'where are you', 'how do I reach you' and 'when are you open'. Blank fields are never mentioned."
          tooltip="Shared with customers by your WhatsApp assistant"
          usedByAgent
        >

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
              <div className="mb-6 flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-3">
                <CheckCircle className="h-4 w-4 text-success-foreground shrink-0" />
                <p className="text-sm text-success-foreground">Required business info complete — the other fields below are optional.</p>
              </div>
            );
          })()}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
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
              <label className="block text-sm font-medium text-foreground mb-2">
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
                  className="mt-2 w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-transparent" 
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
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

            {/* Contact Details — these were projected into business_overview and saved
                by handleUpdateBusiness, but had no input anywhere, so they stayed NULL
                and the agent could never share them. Now editable here. */}
            <div className="pt-6 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-medium text-foreground">Contact Details <span className="text-sm font-normal text-muted-foreground">(optional)</span></h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                The WhatsApp agent shares these when a customer asks how to reach you. Leave a field blank and the agent won't mention it.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Business Email
                  </label>
                  {renderInputField(
                    'business_email',
                    localBusinessData.business_email,
                    (value) => updateBusinessField('business_email', value),
                    'name@yourbusiness.com'
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Business Phone
                  </label>
                  {renderInputField(
                    'business_phone',
                    localBusinessData.business_phone,
                    (value) => updateBusinessField('business_phone', value),
                    '+31 6 12345678'
                  )}
                </div>
                {/* WhatsApp Bookingsassistant — the ONE platform number every customer
                    messages. Read-only on purpose: it is not the owner's data, it is
                    the shared platform line (single-sourced in constants/platform.ts).
                    The old editable business_whatsapp field was an orphan the agent
                    never read; it is no longer sent in the save payload. */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {PLATFORM_WHATSAPP_LABEL}
                  </label>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2">
                    <span className="font-medium text-foreground">{PLATFORM_WHATSAPP_DISPLAY}</span>
                    <span className="text-xs text-muted-foreground">Platform number</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This is the WhatsApp number your customers message. Share it, or show the QR code on the WhatsApp Bookingsassistant page.
                  </p>
                </div>
              </div>
            </div>

            {/* Address Section within Business Information */}
            <div className="pt-6 border-t border-border">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-foreground">Address Details <span className="text-sm font-normal text-muted-foreground">(optional)</span></h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  The assistant shares your address when a customer asks where you are. Leave it blank and the agent won't give out a location.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
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
                  <label className="block text-sm font-medium text-foreground mb-2">
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
                  <label className="block text-sm font-medium text-foreground mb-2">
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
                  <label className="block text-sm font-medium text-foreground mb-2">
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
                  <label className="block text-sm font-medium text-foreground mb-2">
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

            {/* Opening hours — read-only here on purpose. They come from your
                Availability schedule (single source), and the assistant shares
                them when a customer asks "when are you open?". */}
            <div className="pt-6 border-t border-border">
              <div className="mb-2">
                <h3 className="text-lg font-medium text-foreground">Opening Hours</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  The assistant tells customers when you're open. These come from your Availability schedule, set them there and they stay in sync everywhere.
                </p>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Website — reduced from the old 7-field social stack to Website only
            (the 5 social platforms were orphan fields the agent never read).
            Website is now wired into the agent (get_business_data), so the
            "Used by your AI agent" badge here is honest. */}
        <SettingsSection
          title={<>Website <span className="text-sm font-normal text-muted-foreground">(optional)</span></>}
          description="The assistant shares your website when a customer asks for it."
          tooltip="Shared with customers by your WhatsApp assistant"
          usedByAgent
        >
          <div className="max-w-md">
            <label className="block text-sm font-medium text-foreground mb-2">
              Website
            </label>
            {renderValidatedField(
              'website',
              localProfileData.website,
              'www.example.com',
              (v) => validateWebsite(v)
            )}
          </div>
        </SettingsSection>

        {/* Business Knowledge Base */}
        <SettingsSection title={<>Booking Agent Knowledge Base <span className="text-sm font-normal text-muted-foreground">(optional)</span></>} tooltip="The AI agent can use this information in its messages" usedByAgent>
          <p className="text-sm text-muted-foreground mb-6">The more you fill in here, the better the AI agent can answer customer questions on WhatsApp without you. Leave a field blank and the agent simply won't claim to know it.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
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
              <label className="block text-sm font-medium text-foreground mb-2">
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
              <label className="block text-sm font-medium text-foreground mb-2">
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
              <label className="block text-sm font-medium text-foreground mb-2">
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
              <label className="block text-sm font-medium text-foreground mb-2">
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
              <label className="block text-sm font-medium text-foreground mb-2">
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
              <label className="block text-sm font-medium text-foreground mb-2">
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
        </SettingsSection>

        {/* Sticky Save Bar */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50 shadow-lg">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
              <span className="text-amber-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                You have unsaved changes
              </span>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={discardChanges}
                  className="border-border text-foreground hover:bg-card"
                >
                  Discard
                </Button>
                <Button 
                  onClick={saveAllChanges} 
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary/90"
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
