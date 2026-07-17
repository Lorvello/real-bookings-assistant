import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke, toast, user, translate } = vi.hoisted(() => ({
  invoke: vi.fn(),
  toast: vi.fn(),
  user: { id: 'owner-1' },
  translate: (_key: string, fallback: string) => fallback,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke } },
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/utils/stripeConfig', () => ({ isTestMode: () => true }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate }),
}));

import { useInstallmentSettings } from '@/hooks/useInstallmentSettings';

describe('useInstallmentSettings authoritative-read gate', () => {
  beforeEach(() => {
    user.id = 'owner-1';
    invoke.mockReset();
    toast.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('blocks a save after the canonical read fails and never sends defaults', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: new Error('network down') });
    const view = renderHook(() => useInstallmentSettings());
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    expect(view.result.current.ready).toBe(false);

    let saved = true;
    await act(async () => {
      saved = await view.result.current.updateSettings({ enabled: true });
    });

    expect(saved).toBe(false);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('merges a save with the server snapshot only after a successful read', async () => {
    const serverSettings = {
      enabled: false,
      allowCustomerChoice: false,
      defaultPlan: { type: 'preset', preset: '100_at_booking' },
      applyToServices: 'selected',
      selectedServices: ['service-1'],
      serviceConfigs: [],
    };
    invoke
      .mockResolvedValueOnce({ data: { success: true, settings: serverSettings }, error: null })
      .mockResolvedValueOnce({
        data: { success: true, settings: { ...serverSettings, enabled: true } },
        error: null,
      });
    const view = renderHook(() => useInstallmentSettings());
    await waitFor(() => expect(view.result.current.ready).toBe(true));

    await act(async () => {
      expect(await view.result.current.updateSettings({ enabled: true })).toBe(true);
    });

    expect(invoke).toHaveBeenLastCalledWith('manage-installment-settings', {
      body: expect.objectContaining({
        action: 'save',
        enabled: true,
        applyToServices: 'selected',
        selectedServices: ['service-1'],
      }),
    });
  });

  it('ignores a late settings response from the previous tenant', async () => {
    const DEFAULT_SETTINGS = {
      enabled: false,
      allowCustomerChoice: false,
      defaultPlan: { type: 'preset' as const, preset: '50_50' as const },
      applyToServices: 'all' as const,
      selectedServices: [] as string[],
      serviceConfigs: [],
    };
    type InvokeResult = {
      data: { success: true; settings: typeof DEFAULT_SETTINGS };
      error: null;
    };
    let resolveOwnerA!: (result: InvokeResult) => void;
    let resolveOwnerB!: (result: InvokeResult) => void;
    invoke
      .mockImplementationOnce(() => new Promise<InvokeResult>((resolve) => {
        resolveOwnerA = resolve;
      }))
      .mockImplementationOnce(() => new Promise<InvokeResult>((resolve) => {
        resolveOwnerB = resolve;
      }));

    const view = renderHook(() => useInstallmentSettings());
    user.id = 'owner-2';
    view.rerender();

    await act(async () => {
      resolveOwnerB({
        data: { success: true, settings: { ...DEFAULT_SETTINGS, enabled: true } },
        error: null,
      });
    });
    await waitFor(() => expect(view.result.current.ready).toBe(true));
    expect(view.result.current.settings?.enabled).toBe(true);

    await act(async () => {
      resolveOwnerA({
        data: { success: true, settings: DEFAULT_SETTINGS },
        error: null,
      });
    });
    expect(view.result.current.settings?.enabled).toBe(true);
    expect(view.result.current.ready).toBe(true);
  });
});
