import React from 'react';
import { act, renderHook, waitFor, render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
type DbRow = Record<string, unknown>;
interface DbResponse { data: DbRow | DbRow[] | null; error: Error | null }
interface DbChain extends PromiseLike<DbResponse> {
  select(): DbChain;
  eq(key: string, value: unknown): DbChain;
  in(key: string, values: unknown[]): DbChain;
  or(): DbChain;
  insert(values: DbRow): DbChain;
  update(values: DbRow): DbChain;
  upsert(values: DbRow): DbChain;
  single(): DbChain;
}
interface DbWrite { table: string; filters: Array<[string, unknown]>; values: DbRow }
const state = vi.hoisted(() => ({
  user: { id: 'owner-a' } as { id: string } | null, profile: { id: 'owner-a', business_name: 'Salon', business_type: 'beauty' },
  calendar: { id: 'cal-a', name: 'Salon A' }, calendars: [{ id: 'cal-a' }, { id: 'cal-b' }],
  language: 'en', access: true, accessLoading: false, incomplete: false, fail: '', writeResult: undefined as DbResponse | Promise<DbResponse> | undefined, readResult: undefined as DbResponse | Promise<DbResponse> | undefined,
  rows: {} as Record<string, DbRow[]>, writes: [] as DbWrite[], toast: vi.fn(), invalidate: vi.fn(), navigate: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: state.profile }) }));
vi.mock('@/contexts/CalendarContext', () => ({ useCalendarContext: () => ({ selectedCalendar: state.calendar, calendars: state.calendars }) }));
vi.mock('@/contexts/UserStatusContext', () => ({ useUserStatus: () => ({ accessControl: { canAccessWhatsApp: state.access }, isLoading: state.accessLoading, userStatus: { isSetupIncomplete: state.incomplete }, invalidateCache: state.invalidate }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock('react-i18next', async () => {
  const settings = (await import('@/i18n/locales/nl/settings.json')).default;
  const app = (await import('@/i18n/locales/nl/app.json')).default;
  return { useTranslation: (namespace: string) => ({
    t: (key: string, fallback: string, options: Record<string, string> = {}) => {
      const root = namespace === 'settings' ? settings : app;
      const translated = state.language === 'nl' ? key.split('.').reduce<unknown>((value, part) => value !== null && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined, root) : undefined;
      return (typeof translated === 'string' && translated ? translated : fallback).replace(/{{(\w+)}}/g, (_: string, k: string) => options[k] ?? '{{' + k + '}}');
    }, i18n: { language: state.language },
  }) };
});
vi.mock('react-router-dom', () => ({ useNavigate: () => state.navigate }));
vi.mock('@/components/calendar-switcher/CreateCalendarDialog', () => ({ CreateCalendarDialog: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const filters: Array<[string, unknown]> = []; let values: DbRow | undefined; let single = false;
  const chain: DbChain = {
    select: () => chain, eq: (k: string, v: unknown) => { filters.push([k, v]); return chain; },
    in: (k: string, v: unknown[]) => { filters.push([k, v]); return chain; }, or: () => chain,
    insert: (v: DbRow) => { values = v; return chain; },
    update: (v: DbRow) => { values = v; return chain; }, upsert: (v: DbRow) => { values = v; return chain; },
    single: () => { single = true; return chain; },
    then: (resolve, reject) => {
      if (state.fail === table) return Promise.resolve({ data: null, error: new Error('Denied') }).then(resolve, reject);
      if (!values && table === 'calendar_settings' && state.readResult !== undefined) return Promise.resolve(state.readResult).then(resolve, reject);
      let rows = (state.rows[table] || []).filter(row => filters.every(([k,v]) => Array.isArray(v) ? v.includes(row[k]) : row[k] === v));
      if (values) {
        state.writes.push({ table, filters, values });
        if (state.writeResult !== undefined) return Promise.resolve(state.writeResult).then(resolve, reject);
        rows = rows.map(row => Object.assign(row, values));
      }
      return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(resolve, reject);
    },
  }; return chain;
} } }));
import { useBotStatus } from './useBotStatus';
import { useOnboardingProgress } from './useOnboardingProgress';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { createDefaultCalendarSettings } from './calendar-settings/calendarSettingsUtils';
import { CalendarBotSettings } from '@/components/calendar-settings/CalendarBotSettings';
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  state.user = { id: 'owner-a' }; state.profile.id = 'owner-a'; state.calendar = { id: 'cal-a', name: 'Salon A' };
  state.language = 'en'; state.access = true; state.accessLoading = false; state.incomplete = false; state.fail = ''; state.writeResult = undefined; state.readResult = undefined;
  state.writes = []; state.toast.mockClear(); state.invalidate.mockClear(); state.navigate.mockClear();
  state.rows = {
    calendar_settings: [{ calendar_id: 'cal-a', whatsapp_bot_active: false }, { calendar_id: 'cal-b', whatsapp_bot_active: true }],
    service_types: [{ id: 'service-a', calendar_id: 'cal-a', is_active: true }],
    availability_schedules: [{ id: 'schedule-a', calendar_id: 'cal-a' }],
    availability_rules: [{ id: 'rule-a', schedule_id: 'schedule-a', is_available: true }],
  };
});
describe('R34 actual React onboarding and activation', () => {
  it('keeps activation visible after all four setup steps, and never activates automatically', async () => {
    render(<OnboardingWizard />, { wrapper: wrapper() });
    expect(await screen.findByText('Activate your assistant')).toBeVisible();
    await waitFor(() => expect(screen.getByText('4/5')).toBeVisible());
    expect(state.writes).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /Review activation/ }));
    expect(state.navigate).toHaveBeenCalledWith('/settings?tab=operations');
  });
  it('refreshes trial status at four steps even with the bot intentionally paused', async () => {
    state.incomplete = true;
    render(<OnboardingWizard />, { wrapper: wrapper() });
    await waitFor(() => expect(state.invalidate).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Activate your assistant')).toBeVisible();
    expect(state.writes).toHaveLength(0);
  });
  it('does not pool services or availability from calendar B into calendar A', async () => {
    state.rows.service_types[0].calendar_id = 'cal-b';
    state.rows.availability_schedules[0].calendar_id = 'cal-b';
    const view = renderHook(() => useOnboardingProgress(), { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));
    expect(view.result.current.allSteps.find(s => s.key === 'service_types')?.completed).toBe(false);
    expect(view.result.current.allSteps.find(s => s.key === 'availability')?.completed).toBe(false);
  });
  it('does not call closed-only hours complete', async () => {
    state.rows.availability_rules[0].is_available = false;
    const view = renderHook(() => useOnboardingProgress(), { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));
    expect(view.result.current.setupComplete).toBe(false);
  });
  it.each(['service_types', 'availability_schedules', 'calendar_settings'])('fails closed on %s read error', async table => {
    state.fail = table;
    const view = renderHook(() => useOnboardingProgress(), { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));
    expect(view.result.current.isError).toBe(true);
    expect(view.result.current.completionPercentage).toBeLessThan(100);
  });
  it('explicitly activates/pause only calendar A and displays confirmed saved state', async () => {
    const view = renderHook(() => useBotStatus('cal-a'), { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.ready).toBe(true));
    act(() => view.result.current.toggleBot(true));
    await waitFor(() => expect(view.result.current.data?.whatsapp_bot_active).toBe(true));
    expect(state.writes[0].filters).toEqual([['calendar_id', 'cal-a']]);
    expect(state.writes[0].values).toEqual({ whatsapp_bot_active: true });
    act(() => view.result.current.toggleBot(false));
    await waitFor(() => expect(view.result.current.data?.whatsapp_bot_active).toBe(false));
    expect(state.rows.calendar_settings[1].whatsapp_bot_active).toBe(true);
  });
  it.each([null, {calendar_id: 'cal-b', whatsapp_bot_active: true}, {calendar_id: 'cal-a', whatsapp_bot_active: false}])('rejects zero/mismatched write return %j', async data => {
    state.writeResult = { data, error: null };
    const view = renderHook(() => useBotStatus('cal-a'), { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.ready).toBe(true));
    act(() => view.result.current.toggleBot(true));
    await waitFor(() => expect(view.result.current.saveError).toBe(true));
    expect(view.result.current.data?.whatsapp_bot_active).toBe(false);
    expect(state.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'WhatsApp bot activated' }));
  });
  it('does not create a missing settings row or claim success', async () => {
    state.rows.calendar_settings = [];
    const view = renderHook(() => useBotStatus('cal-a'), { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));
    expect(view.result.current.ready).toBe(false);
    act(() => view.result.current.toggleBot(true));
    await waitFor(() => expect(view.result.current.saveError).toBe(true));
    expect(state.writes).toHaveLength(0);
  });
  it('prevents activation without subscription access while allowing an explicit pause', async () => {
    state.access = false;
    const view = renderHook(() => useBotStatus('cal-b'), { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.ready).toBe(true));
    act(() => view.result.current.toggleBot(true));
    await waitFor(() => expect(view.result.current.saveError).toBe(true));
    expect(state.writes).toHaveLength(0);
    act(() => view.result.current.toggleBot(false));
    await waitFor(() => expect(view.result.current.data?.whatsapp_bot_active).toBe(false));
  });
  it('cannot reuse the previous owner cached active state when the next owner read is denied', async () => {
    const view = renderHook(() => useBotStatus('cal-b'), { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.ready).toBe(true));
    state.user = { id: 'owner-b' }; state.fail = 'calendar_settings'; view.rerender();
    await waitFor(() => expect(view.result.current.isError).toBe(true));
    expect(view.result.current.data).toBeUndefined();
  });
  it('shows pending without announcing activation until the returned row is verified', async () => {
    let finish!: (value: DbResponse) => void;
    state.writeResult = new Promise(resolve => { finish = resolve; });
    render(<CalendarBotSettings calendarId="cal-a" calendarName="Salon A" />, { wrapper: wrapper() });
    await waitFor(() => expect(screen.getByRole('switch')).toBeEnabled());
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saving…'));
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('switch')).not.toBeChecked();
    await act(async () => finish({ data: {calendar_id: 'cal-a', whatsapp_bot_active: true}, error: null }));
    await waitFor(() => expect(screen.getByRole('switch')).toBeChecked());
  });
  it('shows write failure inline and preserves paused state', async () => {
    state.writeResult = { data: null, error: new Error('Denied') };
    render(<CalendarBotSettings calendarId="cal-a" />, { wrapper: wrapper() });
    await waitFor(() => expect(screen.getByRole('switch')).toBeEnabled());
    fireEvent.click(screen.getByRole('switch'));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved');
    expect(screen.getByRole('switch')).not.toBeChecked();
  });
  it('late save for A cannot overwrite the displayed B calendar', async () => {
    let finish!: (value: DbResponse) => void;
    state.writeResult = new Promise(resolve => { finish = resolve; });
    const view = renderHook(({ id }) => useBotStatus(id), { initialProps: { id: 'cal-a' }, wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.ready).toBe(true));
    act(() => view.result.current.toggleBot(true));
    view.rerender({ id: 'cal-b' });
    await waitFor(() => expect(view.result.current.data?.calendar_id).toBe('cal-b'));
    await act(async () => finish({ data: { calendar_id: 'cal-a', whatsapp_bot_active: true }, error: null }));
    expect(view.result.current.data?.calendar_id).toBe('cal-b');
  });
  it('renders the Dutch status and label from shipped translations', async () => {
    state.language = 'nl';
    render(<CalendarBotSettings calendarId="cal-a" calendarName="Salon A" />, { wrapper: wrapper() });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Gepauzeerd voor deze agenda'));
    expect(screen.getByRole('switch', { name: 'WhatsApp voor Salon A' })).toBeEnabled();
  });
  it('new-calendar settings explicitly use enabled reminders at24h/60m and leave bot paused', async () => {
    await createDefaultCalendarSettings('cal-new', 'owner-a');
    expect(state.writes[0].values).toMatchObject({ calendar_id: 'cal-new', whatsapp_bot_active: false,
      first_reminder_enabled: true, second_reminder_enabled: true, first_reminder_timing_hours: 24, second_reminder_timing_minutes: 60 });
  });
  it('renders disabled missing-calendar control and no live claim', () => {
    render(<CalendarBotSettings />, { wrapper: wrapper() });
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Select a calendar first.');
  });
});

// Reviewer regression: let Query notifications settle after the old read resolves.
describe('R34 FIX1 stale read after verified write', () => {
  it.each([false, true])('old read cannot overwrite confirmed bot status %s', async target => {
    state.rows.calendar_settings[0].whatsapp_bot_active = !target;
    const view = renderHook(() => useBotStatus('cal-a'), { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.ready).toBe(true));
    let finish!: (value: DbResponse) => void;
    state.readResult = new Promise(resolve => { finish = resolve; });
    let reading: Promise<unknown> | undefined;
    act(() => { reading = view.result.current.refetch(); });
    act(() => view.result.current.toggleBot(target));
    await waitFor(() => expect(view.result.current.data?.whatsapp_bot_active).toBe(target));
    expect(state.rows.calendar_settings[0].whatsapp_bot_active).toBe(target);
    await act(async () => {
      finish({data: {calendar_id: 'cal-a', whatsapp_bot_active: !target}, error: null});
      await reading;
      await new Promise(resolve => setTimeout(resolve, 30));
    });
    expect(view.result.current.data?.whatsapp_bot_active).toBe(target);
    expect(view.result.current.ready).toBe(true);
  });
  it('logout cannot reuse the cached ready status or mutate', async () => {
    const view = renderHook(() => useBotStatus('cal-a'), { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.ready).toBe(true));
    state.user = null;
    view.rerender();
    expect(view.result.current.ready).toBe(false);
    expect(view.result.current.data).toBeUndefined();
    act(() => view.result.current.toggleBot(true));
    await waitFor(() => expect(view.result.current.saveError).toBe(true));
    expect(state.writes).toHaveLength(0);
    state.user = { id: 'owner-a' };
  });
});
