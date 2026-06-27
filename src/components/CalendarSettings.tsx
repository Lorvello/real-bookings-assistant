import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { CalendarPolicySettings } from './calendar-settings/CalendarPolicySettings';
import { GlobalSettings } from './calendar-settings/GlobalSettings';
import { SettingsSection } from './settings/SettingsSection';
import { SettingsSaveBar } from './settings/SettingsSaveBar';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';

interface CalendarSettingsProps {
  calendarId: string;
  showGlobalSettings?: boolean;
}

export function CalendarSettings({ calendarId, showGlobalSettings = true }: CalendarSettingsProps) {
  const { t } = useTranslation('settings');
  const { settings, loading, saving, hasPendingChanges, updatePendingSettings, saveAllChanges, discardChanges } = useCalendarSettings(calendarId);
  const { selectedCalendar } = useCalendarContext();
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(savedTimer.current), []);

  // Warn before leaving with unsaved changes (shared across every SaveBar surface;
  // Operations was the only floating-SaveBar tab missing this guard).
  useUnsavedChangesWarning(hasPendingChanges);

  const handleSave = async () => {
    const ok = await saveAllChanges();
    if (ok) {
      setJustSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setJustSaved(false), 2000);
    }
  };

  if (loading) {
    return (
      <SettingsSection icon={SlidersHorizontal} title={t('settings.operations.sections.policies.title', 'Booking policies')}>
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('settings.operations.loading.policies', 'Loading policies…')}
        </div>
      </SettingsSection>
    );
  }

  if (!settings) {
    return (
      <SettingsSection
        icon={SlidersHorizontal}
        title={t('settings.operations.sections.policies.title', 'Booking policies')}
        description={t('settings.operations.emptyState.policiesAutoCreated', 'Settings will be created automatically as soon as you make your first change.')}
      >
        <p className="text-sm text-muted-foreground">{t('settings.operations.emptyState.noPolicies', 'No policies yet for this calendar.')}</p>
      </SettingsSection>
    );
  }

  return (
    <div className="space-y-6">
      {showGlobalSettings && (
        <SettingsSection
          title={t('settings.operations.sections.whatsappAssistant.title', 'WhatsApp assistant')}
          description={t('settings.operations.sections.whatsappAssistant.description', 'Turn the automated booking assistant on or off across every calendar.')}
          usedByAgent
        >
          <GlobalSettings />
        </SettingsSection>
      )}

      <SettingsSection
        icon={SlidersHorizontal}
        title={t('settings.operations.sections.policies.title', 'Booking policies')}
        description={t('settings.operations.sections.policies.descriptionFull', 'How customers can book {{calendarName}} — slot length, notice, daily limits, cancellation and reminders.', { calendarName: selectedCalendar?.name || 'this calendar' })}
        usedByAgent
      >
        <CalendarPolicySettings settings={settings} onUpdate={updatePendingSettings} />
      </SettingsSection>

      {/* Explicit Save — consistent with UserManagement/AIKnowledgeTab. The floating pill
          appears only when there's a real unsaved diff (hasPendingChanges) and morphs to
          "Saved" after a successful save. */}
      <SettingsSaveBar
        dirty={hasPendingChanges}
        saving={saving}
        justSaved={justSaved}
        onSave={handleSave}
        onDiscard={discardChanges}
      />
    </div>
  );
}
