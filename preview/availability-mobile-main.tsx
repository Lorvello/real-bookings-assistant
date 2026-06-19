// DEV-ONLY no-auth visual harness for the D3 mobile sweep of the Availability
// "Weekly hours" editor (launch-ready-loop §7). AvailabilityDayRow + TimeBlockRow
// are PURE props (no hooks/context), so we mount the REAL components against local
// mock state at a 375px-constrained width to prove the day row no longer overflows
// on mobile (the R27 BLOCKER). Not part of the production build.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { AvailabilityDayRow } from '@/components/availability/AvailabilityDayRow';

interface Block { id: string; startTime: string; endTime: string; }
interface DayState { enabled: boolean; timeBlocks: Block[]; }

const DAYS = [
  { key: 'monday', label: 'Monday', isWeekend: false, dayOfWeek: 1 },
  { key: 'tuesday', label: 'Tuesday', isWeekend: false, dayOfWeek: 2 },
  { key: 'wednesday', label: 'Wednesday', isWeekend: false, dayOfWeek: 3 },
  { key: 'sunday', label: 'Sunday', isWeekend: true, dayOfWeek: 0 },
];

function Harness() {
  // Monday: single block (Add+Copy buttons). Tuesday: two blocks (Delete buttons,
  // worst-case width). Wednesday: single block. Sunday: disabled.
  const [state, setState] = useState<Record<string, DayState>>({
    monday: { enabled: true, timeBlocks: [{ id: 'm1', startTime: '09:00', endTime: '17:00' }] },
    tuesday: { enabled: true, timeBlocks: [
      { id: 't1', startTime: '09:00', endTime: '12:00' },
      { id: 't2', startTime: '13:00', endTime: '17:00' },
    ] },
    wednesday: { enabled: true, timeBlocks: [{ id: 'w1', startTime: '10:00', endTime: '18:00' }] },
    sunday: { enabled: false, timeBlocks: [] },
  });
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  const noop = () => {};
  const toggle = (id: string) => setOpenDropdowns((d) => ({ ...d, [id]: !d[id] }));
  const close = (id: string) => setOpenDropdowns((d) => ({ ...d, [id]: false }));
  const setEnabled = (key: string, enabled: boolean) =>
    setState((s) => ({ ...s, [key]: { ...s[key], enabled } }));

  return (
    <div className="dark main-scrollbar h-screen overflow-y-auto bg-background">
      {/* Mirror the real /availability mobile constraint: p-3 page padding → ~351px content */}
      <div className="p-3">
        <div id="probe" className="rounded-xl border border-white/[0.08] bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Weekly hours</h2>
          <div className="divide-y divide-white/[0.05]">
            {DAYS.map((day) => (
              <AvailabilityDayRow
                key={day.key}
                day={day}
                dayAvailability={state[day.key]}
                openDropdowns={openDropdowns}
                hasPendingUpdates={false}
                hasSyncingRules={false}
                onUpdateDayEnabled={setEnabled}
                onUpdateTimeBlock={noop}
                onAddTimeBlock={noop}
                onRemoveTimeBlock={noop}
                onCopyDay={noop}
                onToggleDropdown={toggle}
                onCloseDropdown={close}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
