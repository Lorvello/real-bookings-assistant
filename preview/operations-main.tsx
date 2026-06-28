// DEV-ONLY no-auth visual harness for the Operations (Calendar) settings surface
// (launch-ready-loop §7). CalendarTab's data hooks (useAuth / react-query /
// CalendarContext) are awkward to fake, but the heaviest NEW UI — CalendarPolicySettings
// — is PURE props (no hooks), so we mount the REAL SettingsSection + the REAL
// CalendarPolicySettings against local mock state. The thin assistant/calendar/
// availability sections mirror CalendarTab's SettingsSection wrappers (already
// reviewed primitives). Not part of the production build.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import '@/i18n'; // bootstrap i18n so NL renders in this standalone harness (sim sweep)
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { CalendarClock, CalendarDays, MessageSquare } from 'lucide-react';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { CalendarPolicySettings } from '@/components/calendar-settings/CalendarPolicySettings';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { Check } from 'lucide-react';

function Harness() {
  const [settings, setSettings] = useState<any>({
    slot_duration: 30,
    buffer_time: 10,
    minimum_notice_hours: 2,
    booking_window_days: 60,
    max_bookings_per_day: null,
    allow_cancellations: true,
    cancellation_deadline_hours: 24,
    first_reminder_enabled: true,
    first_reminder_timing_hours: 24,
    second_reminder_enabled: false,
    second_reminder_timing_minutes: 60,
  });
  const [botActive, setBotActive] = useState(true);

  const onUpdate = (u: any) => setSettings((s: any) => ({ ...s, ...u }));

  return (
    <MemoryRouter>
      <div className="dark main-scrollbar h-screen overflow-y-auto bg-background p-3 md:p-8">
        <div className="mx-auto max-w-6xl">
          <SimplePageHeader title="Settings" />
          <div className="mt-6 md:mt-8">
            <div className="flex flex-col gap-5 md:flex-row md:gap-8">
              <aside className="md:w-60 md:shrink-0" />
              <div className="min-w-0 flex-1 md:max-w-3xl">
                <div className="space-y-6">
                  <SettingsSection
                    icon={MessageSquare}
                    title="WhatsApp assistant"
                    description="Turn the automated booking assistant on or off across every calendar."
                    usedByAgent
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0 space-y-1">
                        <p className="text-[13px] font-medium leading-[18px] text-foreground">WhatsApp bot active</p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          When on, the assistant replies to WhatsApp messages and books appointments for
                          customers automatically. When off, it stays silent and no one receives a reply.
                        </p>
                      </div>
                      <Switch checked={botActive} onCheckedChange={setBotActive} aria-label="WhatsApp bot active" />
                    </div>
                  </SettingsSection>

                  <SettingsSection
                    icon={CalendarDays}
                    title="Calendar"
                    description="Choose which calendar these availability and booking policies apply to."
                  >
                    <div className="flex h-10 w-full max-w-xs items-center justify-between rounded-md border border-white/[0.08] bg-muted px-3 text-sm text-foreground">
                      Glow Studio — Main
                      <span className="text-subtle-foreground">▾</span>
                    </div>
                  </SettingsSection>

                  <SettingsSection
                    icon={CalendarClock}
                    title="Availability & opening hours"
                    description="Set your weekly opening hours and date-specific overrides. The assistant only offers customers the slots you're actually open."
                    usedByAgent
                    action={<Button variant="outline" className="shrink-0">Manage</Button>}
                  >
                    <p className="text-sm leading-6 text-muted-foreground">
                      Closed days and holidays are respected automatically — customers are never offered a
                      time you're not available.
                    </p>
                  </SettingsSection>

                  <SettingsSection
                    icon={CalendarClock}
                    title="Booking policies"
                    description="How customers can book Glow Studio — slot length, notice, daily limits, cancellation and reminders."
                    usedByAgent
                  >
                    <CalendarPolicySettings settings={settings} onUpdate={onUpdate} />
                    <div className="mt-7 flex items-center justify-end gap-2 border-t border-white/[0.05] pt-5 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-success-foreground" />
                      <span>All changes save automatically</span>
                    </div>
                  </SettingsSection>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
