import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useDailyAvailabilityManager } from './useDailyAvailabilityManager';

// R70-2/R73: this used to seed + fall back to a hardcoded 08:00-19:00 guess,
// and the useEffect that commits `rules` into `availability` ran on every
// new `rules` reference unconditionally - including the window where a
// calendar switch has changed `defaultSchedule.id` but the rules fetch for
// that NEW schedule id has not resolved yet (rules/loading still reflect the
// PREVIOUS schedule, or the initial empty/loading state). This test drives
// the hook through exactly that sequence with controlled mock data and
// asserts the fix's `isResolvingSchedule` flag is true for that window, and
// that `availability` is never committed with the fabricated fallback shape.

const mockCalendarContext = vi.fn();
const mockSchedules = vi.fn();
const mockRules = vi.fn();

vi.mock('@/contexts/CalendarContext', () => ({
  useCalendarContext: () => mockCalendarContext(),
}));

vi.mock('@/hooks/useAvailabilitySchedules', () => ({
  useAvailabilitySchedules: (calendarId?: string) => mockSchedules(calendarId),
}));

vi.mock('@/hooks/useAvailabilityRules', () => ({
  useAvailabilityRules: (scheduleId?: string) => mockRules(scheduleId),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));

function TestHarness({ onChange }: { onChange: () => void }) {
  const result = useDailyAvailabilityManager(onChange);
  return (
    <div>
      <div data-testid="resolving">{String(result.isResolvingSchedule)}</div>
      <div data-testid="monday-start">
        {result.availability.monday?.timeBlocks?.[0]?.startTime ?? 'UNSET'}
      </div>
      <div data-testid="monday-end">
        {result.availability.monday?.timeBlocks?.[0]?.endTime ?? 'UNSET'}
      </div>
      <div data-testid="schedule-id">{result.defaultSchedule?.id ?? 'NONE'}</div>
    </div>
  );
}

const CAL_A = { id: 'cal-A', is_default: true, name: 'Centrum', timezone: 'UTC' };
const CAL_B = { id: 'cal-B', is_default: false, name: 'Noord', timezone: 'UTC' };
const SCHEDULE_A = { id: 'sched-A', is_default: true };
const SCHEDULE_B = { id: 'sched-B', is_default: true };

// Real rows: Monday 09:00-17:00 for schedule A, Monday 10:00-14:00 for schedule B.
const RULES_A = [
  { id: 'r1', schedule_id: 'sched-A', day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', is_available: true },
];
const RULES_B = [
  { id: 'r2', schedule_id: 'sched-B', day_of_week: 1, start_time: '10:00:00', end_time: '14:00:00', is_available: true },
];

describe('useDailyAvailabilityManager - R70-2/R73 calendar-switch flicker fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never exposes the hardcoded 08:00-19:00 fallback while a schedule switch is in flight, and gates via isResolvingSchedule', async () => {
    // Step 1: calendar A selected, schedule A resolved, rules A loaded (steady state).
    mockCalendarContext.mockReturnValue({ calendars: [CAL_A, CAL_B], selectedCalendar: CAL_A });
    mockSchedules.mockReturnValue({ schedules: [SCHEDULE_A] });
    mockRules.mockReturnValue({
      rules: RULES_A,
      loading: false,
      createRule: vi.fn(),
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
      syncingRules: new Set(),
      refetch: vi.fn(),
    });

    const { rerender } = render(<TestHarness onChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId('monday-start').textContent).toBe('09:00');
      expect(screen.getByTestId('monday-end').textContent).toBe('17:00');
    });
    expect(screen.getByTestId('resolving').textContent).toBe('false');

    // Step 2: user switches to calendar B. `selectedCalendar` flips
    // atomically (CalendarContext.selectCalendar never nulls it first), so
    // `schedules` and `rules` for the NEW calendar are not fetched yet -
    // exactly R70-2's race. `useAvailabilityRules` reports `loading: true`
    // for the in-flight fetch, and `rules` is whatever it still held before
    // (simulating the real hook's behavior of not clearing rules to [] first).
    mockCalendarContext.mockReturnValue({ calendars: [CAL_A, CAL_B], selectedCalendar: CAL_B });
    mockSchedules.mockReturnValue({ schedules: [SCHEDULE_B] });
    mockRules.mockReturnValue({
      rules: RULES_A, // stale: still schedule A's rows, B's fetch hasn't resolved
      loading: true,
      createRule: vi.fn(),
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
      syncingRules: new Set(),
      refetch: vi.fn(),
    });

    await act(async () => {
      rerender(<TestHarness onChange={() => {}} />);
    });

    // THE FIX: isResolvingSchedule must be true (schedule id changed to
    // sched-B, but the rules loading flag has not resolved for sched-B yet).
    expect(screen.getByTestId('schedule-id').textContent).toBe('sched-B');
    expect(screen.getByTestId('resolving').textContent).toBe('true');

    // And the displayed availability must NOT have been overwritten with
    // stale schedule-A data mislabeled as schedule-B's, NOR ever show the
    // old hardcoded 08:00-19:00 guess. It should still show the last
    // legitimately-committed value (09:00-17:00, schedule A's real data)
    // because the fix's sync effect skips committing while resolving.
    expect(screen.getByTestId('monday-start').textContent).not.toBe('08:00');
    expect(screen.getByTestId('monday-end').textContent).not.toBe('19:00');

    // Step 3: schedule B's rules fetch resolves.
    mockRules.mockReturnValue({
      rules: RULES_B,
      loading: false,
      createRule: vi.fn(),
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
      syncingRules: new Set(),
      refetch: vi.fn(),
    });

    await act(async () => {
      rerender(<TestHarness onChange={() => {}} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('monday-start').textContent).toBe('10:00');
      expect(screen.getByTestId('monday-end').textContent).toBe('14:00');
    });
    expect(screen.getByTestId('resolving').textContent).toBe('false');
  });

  it('regression guard: a genuinely empty (zero-row) day still resolves to a value once loaded, not stuck on isResolvingSchedule forever', async () => {
    mockCalendarContext.mockReturnValue({ calendars: [CAL_A], selectedCalendar: CAL_A });
    mockSchedules.mockReturnValue({ schedules: [SCHEDULE_A] });
    mockRules.mockReturnValue({
      rules: [], // genuinely zero rows for this schedule, fetch already resolved
      loading: false,
      createRule: vi.fn(),
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
      syncingRules: new Set(),
      refetch: vi.fn(),
    });

    render(<TestHarness onChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId('resolving').textContent).toBe('false');
    });
    // Confirmed-empty-after-load still uses the day-default shape (existing,
    // pre-R73 behavior for a real zero-rows day is unchanged by this fix -
    // only the MID-SWITCH flicker path was closed).
    expect(screen.getByTestId('monday-start').textContent).toBe('08:00');
  });
});
