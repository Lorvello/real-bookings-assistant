import React from 'react';
import { Check, Loader2, SlidersHorizontal } from 'lucide-react';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { CalendarPolicySettings } from './calendar-settings/CalendarPolicySettings';
import { GlobalSettings } from './calendar-settings/GlobalSettings';
import { SettingsSection } from './settings/SettingsSection';

interface CalendarSettingsProps {
  calendarId: string;
  showGlobalSettings?: boolean;
}

export function CalendarSettings({ calendarId, showGlobalSettings = true }: CalendarSettingsProps) {
  const { settings, loading, saving, updatePendingSettings } = useCalendarSettings(calendarId);
  const { selectedCalendar } = useCalendarContext();

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

        {/* Auto-save: changes persist a second after you stop editing, so there's no
            manual Save button to forget. A calm status line confirms it. */}
        <div className="mt-7 flex items-center justify-end gap-2 border-t border-white/[0.05] pt-5 text-xs text-muted-foreground">
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-foreground" />
              <span className="text-muted-foreground">Saving…</span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 text-success-foreground" />
              <span>All changes save automatically</span>
            </>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
