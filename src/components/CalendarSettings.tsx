import React, { useState, useRef, useEffect } from 'react';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { CalendarPolicySettings } from './calendar-settings/CalendarPolicySettings';
import { GlobalSettings } from './calendar-settings/GlobalSettings';
import { SettingsSection } from './settings/SettingsSection';
import { SettingsSaveBar } from './settings/SettingsSaveBar';

interface CalendarSettingsProps {
  calendarId: string;
  showGlobalSettings?: boolean;
}

export function CalendarSettings({ calendarId, showGlobalSettings = true }: CalendarSettingsProps) {
  const { settings, loading, saving, hasPendingChanges, updatePendingSettings, saveAllChanges, discardChanges } = useCalendarSettings(calendarId);
  const { selectedCalendar } = useCalendarContext();
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(savedTimer.current), []);

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
      <SettingsSection icon={SlidersHorizontal} title="Booking policies">
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading policies…
        </div>
      </SettingsSection>
    );
  }

  if (!settings) {
    return (
      <SettingsSection
        icon={SlidersHorizontal}
        title="Booking policies"
        description="Settings will be created automatically as soon as you make your first change."
      >
        <p className="text-sm text-muted-foreground">No policies yet for this calendar.</p>
      </SettingsSection>
    );
  }

  return (
    <div className="space-y-6">
      {showGlobalSettings && (
        <SettingsSection
          title="WhatsApp assistant"
          description="Turn the automated booking assistant on or off across every calendar."
          usedByAgent
        >
          <GlobalSettings />
        </SettingsSection>
      )}

      <SettingsSection
        icon={SlidersHorizontal}
        title="Booking policies"
        description={`How customers can book ${selectedCalendar?.name || 'this calendar'} — slot length, notice, daily limits, cancellation and reminders.`}
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
