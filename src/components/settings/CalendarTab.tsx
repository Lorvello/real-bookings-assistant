import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const { selectedCalendar, calendars } = useCalendarContext();

  // The master on/off for the assistant — always shown, top of the page.
  const assistant = (
    <SettingsSection
      icon={MessageSquare}
      title={t('settings.operations.sections.whatsappAssistant.title', 'WhatsApp assistant')}
      description={t('settings.operations.sections.whatsappAssistant.description', 'Turn the automated booking assistant on or off across every calendar.')}
      usedByAgent
    >
      <GlobalSettings />
    </SettingsSection>
  );

  // Availability is the #1 operational input; the full editor lives on /availability.
  const availability = (
    <SettingsSection
      icon={CalendarClock}
      title={t('settings.operations.sections.availability.title', 'Availability & opening hours')}
      description={t('settings.operations.sections.availability.description', "Set your weekly opening hours and date-specific overrides. The assistant only offers customers the slots you're actually open.")}
      usedByAgent
      action={
        <Button variant="outline" onClick={() => navigate('/availability')} className="shrink-0">
          {t('settings.operations.buttons.manageAvailability', 'Manage')}
        </Button>
      }
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {t('settings.operations.sections.availability.hint', "Closed days and holidays are respected automatically — customers are never offered a time you're not available.")}
      </p>
    </SettingsSection>
  );

  if (calendars.length === 0) {
    return (
      <div className="space-y-6">
        {assistant}
        {availability}
        <CalendarRequiredEmptyState
          title={t('settings.operations.emptyState.title', 'No calendar found')}
          description={t('settings.operations.emptyState.description', "You don't have any calendars yet. Create one to start managing your operations settings.")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {assistant}

      <SettingsSection
        icon={CalendarDays}
        title={t('settings.operations.sections.calendar.title', 'Calendar')}
        description={t('settings.operations.sections.calendar.description', 'Choose which calendar these availability and booking policies apply to.')}
      >
        <CalendarSwitcher hideAllCalendarsOption={true} />
      </SettingsSection>

      {availability}

      {selectedCalendar ? (
        <CalendarSettings calendarId={selectedCalendar.id} showGlobalSettings={false} />
      ) : (
        <SettingsSection
          icon={SlidersHorizontal}
          title={t('settings.operations.sections.policies.title', 'Booking policies')}
          description={t('settings.operations.sections.policies.description', 'Select a calendar above to manage its booking policies.')}
        >
          <p className="text-sm text-muted-foreground">{t('settings.operations.emptyState.noPoliciesDescription', 'No calendar selected yet.')}</p>
        </SettingsSection>
      )}
    </div>
  );
}
