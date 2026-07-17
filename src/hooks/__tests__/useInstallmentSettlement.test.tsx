import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toastSpy, rpcSpy } = vi.hoisted(() => ({
  toastSpy: vi.fn(),
  rpcSpy: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: rpcSpy },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

import { useInstallmentSettlement } from '@/hooks/useInstallmentSettlement';

const bookingId = '50000000-0000-4000-8000-000000000001';

describe('useInstallmentSettlement', () => {
  beforeEach(() => {
    toastSpy.mockReset();
    rpcSpy.mockReset();
  });

  it('records the appointment balance through the owner-only RPC', async () => {
    rpcSpy.mockResolvedValue({
      data: { success: true, payment_status: 'paid', idempotent_replay: false },
      error: null,
    });
    const onSettled = vi.fn();
    const { result } = renderHook(() => useInstallmentSettlement(onSettled));

    let ok = false;
    await act(async () => {
      ok = await result.current.settle(bookingId);
    });

    expect(ok).toBe(true);
    expect(rpcSpy).toHaveBeenCalledWith('record_installment_balance_collected', {
      p_booking_id: bookingId,
    });
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Remaining payment recorded',
    }));
  });

  it('surfaces a database rejection and never reports success', async () => {
    rpcSpy.mockResolvedValue({
      data: null,
      error: { message: 'Access denied: account owner required' },
    });
    const onSettled = vi.fn();
    const { result } = renderHook(() => useInstallmentSettlement(onSettled));

    let ok = true;
    await act(async () => {
      ok = await result.current.settle(bookingId);
    });

    expect(ok).toBe(false);
    expect(onSettled).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
    }));
  });

  it('rejects a malformed booking id before the network call', async () => {
    const { result } = renderHook(() => useInstallmentSettlement());

    await act(async () => {
      expect(await result.current.settle('not-a-uuid')).toBe(false);
    });

    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
