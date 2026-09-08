import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  selectedCalendar: { id: 'A' } as { id: string } | null,
  user: { id: 'ownerA' } as { id: string } | null,
  authLoading: false,
  rpc: vi.fn(), removeChannel: vi.fn(), callbacks: [] as (() => void)[],
}));
vi.mock('@/contexts/CalendarContext', () => ({ useCalendarContext: () => ({ selectedCalendar: state.selectedCalendar }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: state.user, loading: state.authLoading }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: state.rpc, removeChannel: state.removeChannel,
  channel: () => { const channel = { on: (_event: unknown, _filter: unknown, callback: () => void) => { state.callbacks.push(callback); return channel; }, subscribe: () => channel }; return channel; },
} }));
import { useDashboardAnalytics } from './useDashboardAnalytics';
function pending() { let resolve!: (value: { data: unknown; error: unknown }) => void; const promise = new Promise<{ data: unknown; error: unknown }>(r => { resolve = r; }); return { promise, resolve }; }
const answer = (n: number) => ({ data: { today_bookings: n, total_revenue: n, total_revenue_currency: 'eur', total_revenue_status: 'single_currency' }, error: null });
describe('current calendar metrics lifetime', () => {
  beforeEach(() => { vi.clearAllMocks(); state.callbacks = []; state.selectedCalendar = { id: 'A' }; state.user = { id: 'ownerA' }; state.authLoading = false; });
  it('pending starts unknown rather than fabricated zero counts', () => {
    state.rpc.mockReturnValue(new Promise(() => undefined)); const { result } = renderHook(useDashboardAnalytics);
    expect(result.current.metrics).toBeNull(); expect(result.current.loading).toBe(true);
  });
  it('switch clears old values immediately and late A cannot overwrite completed B', async () => {
    const first = pending(), old = pending(), current = pending(); state.rpc.mockReturnValueOnce(first.promise).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const { result, rerender } = renderHook(useDashboardAnalytics); await act(async () => first.resolve(answer(11)));
    expect(result.current.metrics?.today_bookings).toBe(11); act(() => result.current.refreshMetrics());
    state.selectedCalendar = { id: 'B' }; rerender(); expect(result.current.metrics).toBeNull(); expect(result.current.loading).toBe(true);
    await act(async () => current.resolve(answer(22))); await act(async () => old.resolve(answer(99)));
    expect(result.current.metrics?.today_bookings).toBe(22); expect(result.current.error).toBeNull(); expect(result.current.loading).toBe(false);
    expect(state.rpc).toHaveBeenLastCalledWith('get_dashboard_metrics', { p_calendar_id: 'B' });
  });
  it('late A error does not clear B loading or replace B result', async () => {
    const old = pending(), current = pending(); state.rpc.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const { result, rerender } = renderHook(useDashboardAnalytics); state.selectedCalendar = { id: 'B' }; rerender();
    await act(async () => old.resolve({ data: null, error: new Error('old failure') }));
    expect(result.current.loading).toBe(true); expect(result.current.error).toBeNull(); expect(result.current.metrics).toBeNull();
    await act(async () => current.resolve(answer(22))); expect(result.current.metrics?.today_bookings).toBe(22);
  });
  it('latest same-calendar refresh wins even when older request finishes last', async () => {
    const old = pending(), current = pending(); state.rpc.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const { result } = renderHook(useDashboardAnalytics); act(() => result.current.refreshMetrics());
    await act(async () => current.resolve(answer(22))); await act(async () => old.resolve(answer(11)));
    expect(result.current.metrics?.today_bookings).toBe(22);
  });
  it('logout hides data even while old calendar remains selected and blocks late responses', async () => {
    const old = pending(); state.rpc.mockReturnValue(old.promise); const { result, rerender } = renderHook(useDashboardAnalytics);
    state.user = null; rerender(); expect(result.current.metrics).toBeNull(); expect(result.current.hasCalendar).toBe(false);
    await act(async () => old.resolve(answer(11))); expect(result.current.metrics).toBeNull(); expect(result.current.loading).toBe(false);
    act(() => result.current.refreshMetrics()); expect(state.rpc).toHaveBeenCalledTimes(1);
  });
  it('account change invalidates same-calendar cached result', async () => {
    state.rpc.mockResolvedValueOnce(answer(11)).mockReturnValue(new Promise(() => undefined)); const { result, rerender } = renderHook(useDashboardAnalytics);
    await act(async () => { await Promise.resolve(); }); expect(result.current.metrics?.today_bookings).toBe(11);
    state.user = { id: 'ownerB' }; rerender(); expect(result.current.metrics).toBeNull(); expect(result.current.loading).toBe(true);
  });
  it('realtime refresh works and callbacks from a removed subscription become inert', async () => {
    state.rpc.mockResolvedValue(answer(11)); const { result, unmount } = renderHook(useDashboardAnalytics);
    await act(async () => { await Promise.resolve(); }); const callback = state.callbacks[0];
    await act(async () => callback()); expect(state.rpc).toHaveBeenCalledTimes(2); expect(result.current.metrics?.today_bookings).toBe(11);
    unmount(); expect(state.removeChannel).toHaveBeenCalledTimes(1); await act(async () => callback()); expect(state.rpc).toHaveBeenCalledTimes(2);
  });
  it('current failure stays unknown and explicit refresh recovers', async () => {
    state.rpc.mockResolvedValueOnce({ data: null, error: new Error('current failure') }).mockResolvedValueOnce(answer(33));
    const { result } = renderHook(useDashboardAnalytics); await act(async () => { await Promise.resolve(); });
    expect(result.current.metrics).toBeNull(); expect(result.current.error).toBeTruthy(); expect(result.current.loading).toBe(false);
    await act(async () => result.current.refreshMetrics()); expect(result.current.metrics?.today_bookings).toBe(33); expect(result.current.error).toBeNull();
  });
});
