import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const handlers = new Map<string, (payload: unknown) => unknown>();
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };

  channel.on.mockImplementation(
    (_type: string, config: { event: string }, callback: (payload: unknown) => unknown) => {
      handlers.set(config.event, callback);
      return channel;
    },
  );
  channel.subscribe.mockImplementation(() => channel);

  return {
    channel,
    handlers,
    invoke: vi.fn(),
    removeChannel: vi.fn(),
    rpc: vi.fn(),
    toast: vi.fn(),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: () => mocks.channel,
    removeChannel: mocks.removeChannel,
    functions: { invoke: mocks.invoke },
    rpc: mocks.rpc,
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string, values?: Record<string, unknown>) =>
      values
        ? fallback.replace(/\{\{(\w+)\}\}/g, (_match, name) => String(values[name] ?? ''))
        : fallback,
  }),
}));

import { useWebhookProcessor } from './useWebhookProcessor';

describe('useWebhookProcessor delivery contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    mocks.handlers.clear();
    mocks.invoke.mockReset();
    mocks.removeChannel.mockReset();
    mocks.rpc.mockReset();
    mocks.toast.mockReset();
    mocks.channel.on.mockClear();
    mocks.channel.subscribe.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleErrorSpy?.mockRestore();
    consoleErrorSpy = undefined;
  });

  it('routes manual processing through the calendar-scoped Edge claim path', async () => {
    mocks.invoke.mockResolvedValue({
      data: { success: true, processed: 1, successful: 1, failed: 0 },
      error: null,
    });

    const { result, unmount } = renderHook(() =>
      useWebhookProcessor('00000000-0000-4000-8000-000000000005')
    );

    await act(async () => {
      await result.current.manualProcessWebhooks();
    });

    expect(mocks.invoke).toHaveBeenCalledWith('process-webhooks', {
      body: {
        source: 'webhook-processor',
        calendar_id: '00000000-0000-4000-8000-000000000005',
      },
    });
    unmount();
    expect(mocks.removeChannel).toHaveBeenCalledWith(mocks.channel);
  });

  it('contains a realtime processing failure instead of leaking an unhandled rejection', async () => {
    vi.useFakeTimers();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.invoke.mockResolvedValue({
      data: null,
      error: { message: 'forced delivery failure' },
    });

    renderHook(() =>
      useWebhookProcessor('00000000-0000-4000-8000-000000000005')
    );
    const insertHandler = mocks.handlers.get('INSERT');
    expect(insertHandler).toBeTypeOf('function');

    await act(async () => {
      await insertHandler?.({
        new: { status: 'pending', event_type: 'booking.created' },
      });
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });
});
