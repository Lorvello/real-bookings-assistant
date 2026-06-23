import React, { useState, useEffect, useMemo, useRef } from 'react';
import Select from 'react-select';
import { Info, AlertCircle, CheckCircle, Building2, Globe, BookOpen } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { businessTypes } from '@/constants/settingsOptions';
import { PLATFORM_WHATSAPP_DISPLAY, PLATFORM_WHATSAPP_LABEL } from '@/constants/platform';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { validateWebsite, validateEmail, validatePhone, type FieldValidation } from '@/utils/socialValidation';
import { SettingsSection } from './SettingsSection';
import { SettingsField } from './SettingsField';
import { SettingsSaveBar } from './SettingsSaveBar';
import { settingsSelectStyles } from './settingsSelectStyles';

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
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();
  const [socialErrors, setSocialErrors] = useState<{
    website?: string; instagram?: string; facebook?: string;
    linkedin?: string; tiktok?: string; youtube?: string; x?: string;
  }>({});
  // Per-field validation errors for the validated BUSINESS fields (email, phone). These flow
  // downstream: business_phone is sent to Stripe Connect as support_phone (rejected when
  // malformed, like the website bug), and both are shared by the WhatsApp agent.
  const [businessErrors, setBusinessErrors] = useState<Record<string, string | undefined>>({});

  // Sync local state when the server data arrives / changes. The settings shell only
  // mounts this tab once profileData has an id, so local state is initialised from
  // real data at mount — no "initialized" flag is needed to gate the save bar.
  useEffect(() => {
    if (profileData?.id) setLocalProfileData(profileData);
  }, [profileData]);

  useEffect(() => {
    if (businessData) setLocalBusinessData(businessData);
  }, [businessData]);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  // Unsaved-changes detection driven purely by a real local≠server diff (with
  // null-guards) — NOT a one-shot flag that can hang invisible (the old E3 bug,
  // where the save bar never appeared if `isInitialized` never flipped).
  const hasUnsavedChanges = useMemo(() => {
    if (!profileData || !businessData || !localProfileData || !localBusinessData) return false;
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

  // The website/link fields this tab owns, each with its validator. Reduced to
  // Website only (the 5 social platforms were orphan fields, now removed).
  const SOCIAL_FIELDS: Array<{
    key: 'website' | 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x';
    validate: (v: string) => { ok: boolean; normalized: string; error?: string };
  }> = [
    { key: 'website', validate: (v) => validateWebsite(v) },
  ];

  // Business fields that carry a format validator (the rest are free text, only trimmed).
  // Keyed by DB column. Email + phone flow downstream (Stripe support_phone / agent), so a
  // malformed value is blocked + flagged here, exactly like the website field.
  const BUSINESS_VALIDATORS: Record<string, (v: string) => FieldValidation> = {
    business_email: validateEmail,
    business_phone: validatePhone,
  };

  // The business fields this tab owns (everything it can edit on this page).
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

    // Business fields: trim every text value (the website bug was untrimmed junk " v v"),
    // and run the format validator on the validated ones (email/phone). An invalid value is
    // flagged inline + skipped (never written), mirroring the link-field flow below.
    const nextBusinessErrors: Record<string, string | undefined> = {};
    let skippedInvalid = 0;
    for (const k of BUSINESS_FIELDS) {
      const rawLocal = (localBusinessData as any)?.[k] ?? '';
      const localVal = typeof rawLocal === 'string' ? rawLocal.trim() : rawLocal;
      const serverVal = (businessData as any)?.[k] ?? '';
      const validate = BUSINESS_VALIDATORS[k];
      if (validate) {
        const r = validate(typeof localVal === 'string' ? localVal : '');
        if (!r.ok) { nextBusinessErrors[k] = r.error; skippedInvalid++; continue; }
        if (r.normalized !== serverVal) changes[k] = r.normalized;
        continue;
      }
      if (localVal !== serverVal) changes[k] = localVal;
    }
    setBusinessErrors(nextBusinessErrors);

    const nextErrors: typeof socialErrors = {};
    const normalizedUpdates: Record<string, string> = {};
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
        setJustSaved(true);
        clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setJustSaved(false), 2200);
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

  const discardChanges = () => {
    setLocalProfileData(profileData);
    setLocalBusinessData(businessData);
    setSocialErrors({});
  };

  const updateBusinessField = (field: string, value: string) => {
    setLocalBusinessData((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateProfileField = (field: string, value: string) => {
    setLocalProfileData((prev: any) => ({ ...prev, [field]: value }));
  };

  // A plain business text/textarea field wired to local state, framed by SettingsField.
  const businessField = (
    field: string,
    label: React.ReactNode,
    opts?: {
      placeholder?: string;
      description?: React.ReactNode;
      optional?: boolean;
      required?: boolean;
      textarea?: boolean;
      rows?: number;
      hint?: React.ReactNode;
      validate?: (v: string) => FieldValidation;
    },
  ) => {
    const value = (localBusinessData as any)?.[field] || '';
    const error = businessErrors[field];
    const onChange = (v: string) => {
      updateBusinessField(field, v);
      // Clear a standing error the moment the user edits, so they aren't nagged while typing.
      if (error) setBusinessErrors((prev) => ({ ...prev, [field]: undefined }));
    };
    // Validate on blur (only for validated fields) so junk is caught before save, like website.
    const onBlur = opts?.validate
      ? (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          const r = opts.validate!(e.target.value);
          setBusinessErrors((prev) => ({ ...prev, [field]: r.ok ? undefined : r.error }));
        }
      : undefined;
    return (
      <SettingsField
        label={label}
        htmlFor={field}
        description={opts?.description}
        optional={opts?.optional}
        required={opts?.required}
        hint={opts?.hint}
        error={error}
      >
        {opts?.textarea ? (
          <Textarea
            id={field}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={opts.rows ?? 3}
            placeholder={opts?.placeholder}
          />
        ) : (
          <Input
            id={field}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={opts?.placeholder}
            aria-invalid={!!error}
          />
        )}
      </SettingsField>
    );
  };

  const descLen = ((localBusinessData as any)?.business_description || '').length;
  const requiredMissing = [
    !((localBusinessData as any)?.business_name?.trim()) && 'Business Name',
    !((localBusinessData as any)?.business_type) && 'Business Type',
  ].filter(Boolean) as string[];

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6 pb-28">
        {/* Plain-language explainer so the owner understands what the agent does
            with this page (no system-prompt / no doctrine exposed). */}
        <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/[0.05] px-4 py-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">How your assistant uses this page</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Everything you fill in here is what your WhatsApp assistant can tell customers, in your name. It shares your contact details, address, website and opening hours on request, and answers questions from your knowledge base. Leave a field blank and the agent simply won't claim to know it.
            </p>
          </div>
        </div>

        {/* Identity + Contact + Address */}
        <SettingsSection
          icon={Building2}
          title="Business Information"
          description="Used to introduce itself and to answer 'where are you', 'how do I reach you' and 'when are you open'. Blank fields are never mentioned."
          tooltip="Shared with customers by your WhatsApp assistant"
          usedByAgent
        >
          {/* Setup requirement: only name + type are needed to finish onboarding. */}
          {requiredMissing.length > 0 ? (
            <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/[0.08] px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
              <p className="text-sm text-warning-foreground">
                <span className="font-medium">Required to finish setup:</span> {requiredMissing.join(' + ')}. Everything else on this page is optional.
              </p>
            </div>
          ) : (
            <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-success/25 bg-success/[0.08] px-4 py-3">
              <CheckCircle className="h-4 w-4 shrink-0 text-success-foreground" />
              <p className="text-sm text-success-foreground">Required business info complete — the other fields below are optional.</p>
            </div>
          )}

          <div className="space-y-5">
            {businessField('business_name', 'Business name', {
              required: true,
              placeholder: 'Enter your business name',
            })}

            <SettingsField label="Business type" htmlFor="business_type" required>
              <Select
                inputId="business_type"
                value={businessTypes.find((type) => type.value === (localBusinessData as any)?.business_type) || null}
                onChange={(option: any) => updateBusinessField('business_type', option?.value || '')}
                options={businessTypes}
                placeholder="Search and select business type…"
                isSearchable
                menuPlacement="auto"
                styles={settingsSelectStyles}
              />
              {(localBusinessData as any)?.business_type === 'other' && (
                <Input
                  className="mt-2"
                  value={(localBusinessData as any)?.business_type_other || ''}
                  onChange={(e) => updateBusinessField('business_type_other', e.target.value)}
                  placeholder="Specify business type…"
                />
              )}
            </SettingsField>

            {businessField('business_description', 'Business description', {
              textarea: true,
              rows: 4,
              placeholder: 'Tell customers about your business…',
              hint: (
                <span className={descLen > 600 ? 'text-gold' : undefined}>
                  {descLen} / 600{descLen > 600 ? ' — shorter keeps replies snappy' : ''}
                </span>
              ),
            })}
          </div>

          {/* Contact Details */}
          <div className="mt-6 space-y-5 border-t border-white/[0.06] pt-6">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Contact details</h4>
              <p className="text-xs leading-5 text-muted-foreground">
                Shared when a customer asks how to reach you. Leave a field blank and the agent won't mention it.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {businessField('business_email', 'Business email', { placeholder: 'name@yourbusiness.com', optional: true, validate: validateEmail })}
              {businessField('business_phone', 'Business phone', { placeholder: '+31 6 12345678', optional: true, validate: validatePhone })}
              <div className="md:col-span-2">
                <SettingsField
                  label={PLATFORM_WHATSAPP_LABEL}
                  description="The WhatsApp number your customers message. Share it, or show the QR code on the WhatsApp Bookingsassistant page."
                >
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-muted px-4 py-2.5">
                    <span className="font-medium text-foreground tabular-nums">{PLATFORM_WHATSAPP_DISPLAY}</span>
                    <span className="rounded-full border border-white/[0.06] px-2 py-0.5 text-xs text-subtle-foreground">Platform number</span>
                  </div>
                </SettingsField>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="mt-6 space-y-5 border-t border-white/[0.06] pt-6">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Address</h4>
              <p className="text-xs leading-5 text-muted-foreground">
                Shared when a customer asks where you are. Leave it blank and the agent won't give out a location.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {businessField('business_street', 'Street name', { placeholder: 'Enter street name', optional: true })}
              {businessField('business_number', 'House number', { placeholder: 'Enter house number', optional: true })}
              {businessField('business_postal', 'Postal code', { placeholder: 'Enter postal code', optional: true })}
              {businessField('business_city', 'City', { placeholder: 'Enter city', optional: true })}
              <div className="md:col-span-2">
                {businessField('business_country', 'Country', { placeholder: 'Enter country', optional: true })}
              </div>
            </div>
          </div>

          {/* Opening hours — read-only, sourced from Availability */}
          <div className="mt-6 border-t border-white/[0.06] pt-6">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Opening hours</h4>
              <p className="text-xs leading-5 text-muted-foreground">
                The assistant tells customers when you're open. These come from your Availability schedule — set them there and they stay in sync everywhere.
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* Website */}
        <SettingsSection
          icon={Globe}
          title="Website"
          description="Shared when a customer asks for it."
          tooltip="Shared with customers by your WhatsApp assistant"
          usedByAgent
        >
          <div className="max-w-md">
            <SettingsField label="Website" htmlFor="website" optional error={socialErrors.website}>
              <Input
                id="website"
                value={(localProfileData as any)?.website || ''}
                onChange={(e) => {
                  updateProfileField('website', e.target.value);
                  if (socialErrors.website) setSocialErrors((prev) => ({ ...prev, website: undefined }));
                }}
                onBlur={(e) => {
                  const r = validateWebsite(e.target.value);
                  setSocialErrors((prev) => ({ ...prev, website: r.ok ? undefined : r.error }));
                }}
                placeholder="www.example.com"
                aria-invalid={!!socialErrors.website}
              />
            </SettingsField>
          </div>
        </SettingsSection>

        {/* Knowledge base */}
        <SettingsSection
          icon={BookOpen}
          title="Booking agent knowledge base"
          description="The more you fill in, the better the agent answers customer questions on WhatsApp without you. Leave a field blank and it won't claim to know it."
          tooltip="The AI agent can use this information in its messages"
          usedByAgent
        >
          <div className="space-y-5">
            {businessField('cancellation_policy', 'Cancellation & reschedule policy', {
              textarea: true,
              optional: true,
              placeholder: 'e.g. Free cancellation up to 24h before; later cancellations or no-shows are charged 50%. Rescheduling is free anytime.',
            })}
            {businessField('payment_info', 'Payment & deposit', {
              textarea: true,
              optional: true,
              placeholder: 'e.g. Pay in the salon by card or cash; a 20% deposit is required to confirm appointments over €100.',
            })}
            {businessField('preparation_info', 'How to prepare / what to bring', {
              textarea: true,
              optional: true,
              placeholder: 'e.g. Come with clean, dry hair. Bring any reference photos. Arrive 5 minutes early.',
            })}
            {businessField('parking_info', 'Parking', {
              textarea: true,
              optional: true,
              placeholder: 'e.g. Free parking at the door, paid parking in the garage around the corner…',
            })}
            {businessField('public_transport_info', 'Public transport', {
              textarea: true,
              optional: true,
              placeholder: 'e.g. 5 minutes walk from the station, bus 12 stops at the door…',
            })}
            {businessField('accessibility_info', 'Accessibility', {
              textarea: true,
              optional: true,
              placeholder: 'e.g. Wheelchair accessible, elevator available, no thresholds…',
            })}
            {businessField('other_info', 'FAQ & anything else', {
              textarea: true,
              optional: true,
              placeholder: 'Common questions + answers, or anything else the assistant should know. e.g. "Do you sell gift vouchers? Yes, just ask in the salon." "Can I bring my child? Of course."',
            })}
          </div>
        </SettingsSection>
      </div>

      {/* Calm floating save bar (replaces the amber alarm). Driven by the real diff. */}
      <SettingsSaveBar
        dirty={hasUnsavedChanges}
        saving={isSaving}
        justSaved={justSaved}
        onSave={saveAllChanges}
        onDiscard={discardChanges}
      />
    </TooltipProvider>
  );
};
