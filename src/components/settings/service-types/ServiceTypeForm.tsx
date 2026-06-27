
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SettingsField } from '@/components/settings/SettingsField';
import { ColorPicker } from './ColorPicker';
import { TeamMemberSelector } from '@/components/service-types/TeamMemberSelector';
import { ServiceCalendarSelector } from './ServiceCalendarSelector';
import { Calendar as CalendarType } from '@/types/database';

interface ServiceTypeFormData {
  name: string;
  description: string;
  duration: string;
  price: string;
  color: string;
  tax_enabled: boolean;
  tax_behavior: 'inclusive' | 'exclusive';
  tax_code: string;
  preparation_time: string;
  cleanup_time: string;
}

interface ServiceTypeFormProps {
  formData: ServiceTypeFormData;
  setFormData: React.Dispatch<React.SetStateAction<ServiceTypeFormData>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEditing: boolean;
  taxConfigured?: boolean;
  userTaxBehavior?: string | null;
  onRefreshTaxStatus?: () => void;
  calendarId?: string;
  selectedTeamMembers?: string[];
  onTeamMembersChange?: (memberIds: string[]) => void;
  // New props for calendar selection
  calendars?: CalendarType[];
  selectedCalendarId?: string | null;
  onCalendarSelect?: (calendarId: string) => void;
  onCalendarCreated?: (calendar: CalendarType) => void;
}

export function ServiceTypeForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  saving,
  isEditing,
  calendarId,
  selectedTeamMembers = [],
  onTeamMembersChange,
  calendars = [],
  selectedCalendarId,
  onCalendarSelect,
  onCalendarCreated
}: ServiceTypeFormProps) {
  const { t } = useTranslation('settings');
  // Surface WHY Save is disabled instead of a silently-greyed button.
  const [nameTouched, setNameTouched] = useState(false);

  // Validation: name required; if tax is on, tax_code + behavior are required.
  const isValidForm = () => {
    if (!formData.name.trim()) return false;
    if (formData.tax_enabled && (!formData.tax_code || !formData.tax_behavior)) return false;
    return true;
  };

  const nameInvalid = nameTouched && !formData.name.trim();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SettingsField
          label={t('settings.services.fields.serviceName', 'Service name')}
          htmlFor="svc-name"
          required
          error={nameInvalid ? t('settings.services.fields.serviceNameRequired', 'Service name is required.') : null}
        >
          <Input
            id="svc-name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            onBlur={() => setNameTouched(true)}
            placeholder={t('settings.services.fields.serviceNamePlaceholder', 'e.g. Haircut')}
            aria-invalid={nameInvalid}
            className={nameInvalid ? 'border-destructive/70 focus-visible:border-destructive/70 focus-visible:ring-destructive/25' : undefined}
          />
        </SettingsField>

        <SettingsField label={t('settings.services.fields.duration', 'Duration')} htmlFor="svc-duration" description={t('settings.services.fields.durationDescription', 'In minutes.')} required>
          <Input
            id="svc-duration"
            type="number"
            min={1}
            value={formData.duration}
            onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
            placeholder="30"
          />
        </SettingsField>

        <SettingsField label={t('settings.services.fields.price', 'Price')} htmlFor="svc-price" description={t('settings.services.fields.priceDescription', 'Leave at 0 for a free service.')}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
            <Input
              id="svc-price"
              type="number"
              min={0}
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="0.00"
              className="pl-7"
            />
          </div>
        </SettingsField>

        <SettingsField label={t('settings.services.fields.color', 'Color')} description={t('settings.services.fields.colorDescription', 'Shown on the calendar and booking views.')}>
          <ColorPicker
            value={formData.color}
            onChange={(color) => setFormData((prev) => ({ ...prev, color }))}
            ariaLabel="Service color"
          />
        </SettingsField>
      </div>

      {/* Prep/cleanup buffers — get_available_slots blocks these minutes around the
          appointment in its conflict check. */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SettingsField
          label={t('settings.services.fields.prepTime', 'Prep time')}
          htmlFor="svc-prep"
          description={t('settings.services.fields.prepTimeDescription', 'Reserved before the appointment (minutes).')}
          optional
        >
          <Input
            id="svc-prep"
            type="number"
            min={0}
            value={formData.preparation_time}
            onChange={(e) => setFormData((prev) => ({ ...prev, preparation_time: e.target.value }))}
            placeholder="0"
          />
        </SettingsField>

        <SettingsField
          label={t('settings.services.fields.cleanupTime', 'Cleanup time')}
          htmlFor="svc-cleanup"
          description={t('settings.services.fields.cleanupTimeDescription', 'Reserved after the appointment (minutes).')}
          optional
        >
          <Input
            id="svc-cleanup"
            type="number"
            min={0}
            value={formData.cleanup_time}
            onChange={(e) => setFormData((prev) => ({ ...prev, cleanup_time: e.target.value }))}
            placeholder="0"
          />
        </SettingsField>
      </div>

      <SettingsField label={t('settings.services.fields.description', 'Description')} htmlFor="svc-description" optional>
        <Textarea
          id="svc-description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          rows={3}
          placeholder={t('settings.services.fields.descriptionPlaceholder', 'Optional description of the service')}
        />
      </SettingsField>

      {/* Calendar Selection Section */}
      {calendars && calendars.length > 0 && onCalendarSelect && onCalendarCreated && (
        <ServiceCalendarSelector
          calendars={calendars}
          selectedCalendarId={selectedCalendarId || null}
          onCalendarSelect={onCalendarSelect}
          onCalendarCreated={onCalendarCreated}
          disabled={saving}
        />
      )}

      {/* (Removed the disabled "Tax Configuration — Coming Soon" placeholder: a
          hard-disabled Lock + dead Switch that can never be turned on (the create
          path hardcodes tax_enabled:false). Re-add when tax config is real.) */}

      {/* Team Member Assignment Section */}
      {calendarId && onTeamMembersChange && (
        <div className="border-t border-white/[0.06] pt-6">
          <TeamMemberSelector
            calendarId={calendarId}
            selectedMemberIds={selectedTeamMembers}
            onSelectionChange={onTeamMembersChange}
            disabled={saving}
          />
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-5">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving || !isValidForm()}>
          {saving ? t('settings.services.savingButton', 'Saving…') : isEditing ? t('settings.services.updateButton', 'Update') : t('settings.services.createButton', 'Create')}
        </Button>
      </div>
    </div>
  );
}
