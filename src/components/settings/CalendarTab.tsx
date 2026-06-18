import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarSettings } from '@/components/CalendarSettings';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Button } from '@/components/ui/button';
import { CalendarClock, CalendarDays, MessageSquare, SlidersHorizontal } from 'lucide-react';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { GlobalSettings } from '@/components/calendar-settings/GlobalSettings';
import { CalendarRequiredEmptyState } from '@/components/ui/CalendarRequiredEmptyState';
import { SettingsSection } from './SettingsSection';

export function CalendarTab() {
  const navigate = useNavigate();
  const { selectedCalendar, calendars } = useCalendarContext();

  // The master on/off for the assistant — always shown, top of the page.
  const assistant = (
    <SettingsSection
      icon={MessageSquare}
      title="WhatsApp assistant"
      description="Turn the automated booking assistant on or off across every calendar."
      usedByAgent
    >
      <GlobalSettings />
    </SettingsSection>
  );

  // Availability is the #1 operational input; the full editor lives on /availability.
  const availability = (
    <SettingsSection
      icon={CalendarClock}
      title="Availability & opening hours"
      description="Set your weekly opening hours and date-specific overrides. The assistant only offers customers the slots you're actually open."
      usedByAgent
      action={
        <Button variant="outline" onClick={() => navigate('/availability')} className="shrink-0">
          Manage
        </Button>
      }
    >
      <p className="text-sm leading-6 text-muted-foreground">
        Closed days and holidays are respected automatically — customers are never offered a time
        you're not available.
      </p>
    </SettingsSection>
  );

  if (calendars.length === 0) {
    return (
      <div className="space-y-6">
        {assistant}
        {availability}
        <CalendarRequiredEmptyState
          title="No calendar found"
          description="You don't have any calendars yet. Create one to start managing your operations settings."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {assistant}

      <SettingsSection
        icon={CalendarDays}
        title="Calendar"
        description="Choose which calendar these availability and booking policies apply to."
      >
        <CalendarSwitcher hideAllCalendarsOption={true} />
      </SettingsSection>

      {availability}

      {selectedCalendar ? (
        <CalendarSettings calendarId={selectedCalendar.id} showGlobalSettings={false} />
      ) : (
        <SettingsSection
          icon={SlidersHorizontal}
          title="Booking policies"
          description="Select a calendar above to manage its booking policies."
        >
          <p className="text-sm text-muted-foreground">No calendar selected yet.</p>
        </SettingsSection>
      )}
    </div>
  );
}
