// DEV-ONLY no-auth visual harness for the B7 Availability premium pass (launch-ready-loop).
// Standalone (NOT the shell rig) so DESKTOP screenshots are reliable: the shell harness's
// preview_screenshot is decoupled from the emulated viewport, so B3/B4/B6 used a standalone
// page for the fresh-eyes design-criticus captures and geometry for mobile. This mounts the
// REAL availability widgets full-width, wrapped EXACTLY as Availability.tsx + AvailabilityManager
// (page padding + the surface-raised card), against mock Auth + Calendar contexts so the
// hook-bound DateOverrides renders its real empty state + add form (useAvailabilityOverrides
// short-circuits to overrides:[] for a calendar id with no rows, so no live fetch matters).
// Not part of the production build (rollup input is index.html only).
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthContext } from '@/contexts/AuthContext';
import { CalendarContext } from '@/contexts/CalendarContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit2 } from 'lucide-react';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { AvailabilityTabs } from '@/components/availability/AvailabilityTabs';
import { AvailabilityDayRow } from '@/components/availability/AvailabilityDayRow';
import { TimezoneDisplay } from '@/components/availability/TimezoneDisplay';
import { DateOverrides } from '@/components/availability/DateOverrides';

const calendars: any[] = [
  { id: 'cal-1', name: 'Glow Studio', slug: 'glow-studio', timezone: 'Europe/Amsterdam', is_active: true },
];
const mockCalendarValue: any = {
  calendars,
  selectedCalendar: calendars[0],
  viewingAllCalendars: false,
  getActiveCalendarIds: () => ['cal-1'],
  loading: false,
  refreshCalendars: async () => {},
  selectCalendar: () => {},
  selectAllCalendars: () => {},
  setViewingAllCalendars: () => {},
};
// No user -> useAvailabilityOverrides short-circuits to overrides:[] + loading:false (no live
// fetch), so DateOverrides renders the real empty state + Add-Exception flow deterministically.
const mockAuthValue: any = {
  user: null,
  session: null,
  loading: false,
  isAuthenticated: false,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {},
};

const AVAIL_DAYS = [
  { key: 'monday', label: 'Monday', isWeekend: false, dayOfWeek: 1 },
  { key: 'tuesday', label: 'Tuesday', isWeekend: false, dayOfWeek: 2 },
  { key: 'wednesday', label: 'Wednesday', isWeekend: false, dayOfWeek: 3 },
  { key: 'thursday', label: 'Thursday', isWeekend: false, dayOfWeek: 4 },
  { key: 'friday', label: 'Friday', isWeekend: false, dayOfWeek: 5 },
  { key: 'saturday', label: 'Saturday', isWeekend: true, dayOfWeek: 6 },
  { key: 'sunday', label: 'Sunday', isWeekend: true, dayOfWeek: 0 },
];

interface Block { id: string; startTime: string; endTime: string; }
interface DayState { enabled: boolean; timeBlocks: Block[]; }

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity } },
});

function Harness() {
  const [activeTab, setActiveTab] = useState('schedule');
  // Tuesday has two time blocks (the worst-case width + the Delete button); the rest single.
  const [state, setState] = useState<Record<string, DayState>>({
    monday: { enabled: true, timeBlocks: [{ id: 'm1', startTime: '09:00', endTime: '17:00' }] },
    tuesday: { enabled: true, timeBlocks: [{ id: 't1', startTime: '09:00', endTime: '12:00' }, { id: 't2', startTime: '13:00', endTime: '17:00' }] },
    wednesday: { enabled: true, timeBlocks: [{ id: 'w1', startTime: '10:00', endTime: '18:00' }] },
    thursday: { enabled: true, timeBlocks: [{ id: 'th1', startTime: '09:00', endTime: '17:00' }] },
    friday: { enabled: true, timeBlocks: [{ id: 'f1', startTime: '09:00', endTime: '16:00' }] },
    saturday: { enabled: false, timeBlocks: [] },
    sunday: { enabled: false, timeBlocks: [] },
  });
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const noop = () => {};

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <CalendarContext.Provider value={mockCalendarValue}>
          <div className="dark main-scrollbar min-h-screen overflow-y-auto bg-background">
            {/* Mirror Availability.tsx page wrapper. */}
            <div className="bg-background min-h-full p-3 sm:p-4 md:p-8">
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                <SimplePageHeader title="Availability" />
                <AvailabilityTabs activeTab={activeTab} onTabChange={setActiveTab} />
                {activeTab === 'overrides' ? (
                  // Mirror AvailabilityManager's content card wrapper.
                  <div className="surface-raised rounded-xl p-4">
                    <DateOverrides />
                  </div>
                ) : (
                  // Mirror AvailabilityContent's schedule grid (overview spans 3/4, timezone 1/4).
                  <div className="surface-raised rounded-xl p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      <div className="lg:col-span-3 space-y-6">
                        {/* Mirror AvailabilityOverview's real "Weekly Hours" Card (rounded-xl surface-raised). */}
                        <Card className="bg-card border-white/[0.08]">
                          <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <CardTitle className="text-lg font-semibold">Weekly Hours</CardTitle>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit All
                            </Button>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {AVAIL_DAYS.map((day) => (
                              <AvailabilityDayRow
                                key={day.key}
                                day={day}
                                dayAvailability={state[day.key]}
                                openDropdowns={openDropdowns}
                                hasPendingUpdates={false}
                                hasSyncingRules={false}
                                onUpdateDayEnabled={(key: string, enabled: boolean) =>
                                  setState((s) => ({ ...s, [key]: { ...s[key], enabled } }))}
                                onUpdateTimeBlock={noop}
                                onAddTimeBlock={noop}
                                onRemoveTimeBlock={noop}
                                onCopyDay={noop}
                                onToggleDropdown={(id: string) => setOpenDropdowns((d) => ({ ...d, [id]: !d[id] }))}
                                onCloseDropdown={(id: string) => setOpenDropdowns((d) => ({ ...d, [id]: false }))}
                              />
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                      <div className="lg:col-span-1">
                        <TimezoneDisplay currentTimezone="Europe/Amsterdam" onTimezoneChange={async () => {}} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Toaster />
          </div>
        </CalendarContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
