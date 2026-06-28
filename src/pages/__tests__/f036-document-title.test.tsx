// F-036 regression proof (launch-ready-loop R22): /success (Success.tsx) and /404
// (NotFound.tsx) wrap no DashboardLayout, so the F-035 title effect never runs for
// them. Before R22 they set no document.title at all, leaving the browser tab stale
// (prior page's title / index.html default). This test mounts the REAL components and
// asserts the tab gets a correct, i18n, brand-suffixed title in BOTH EN and NL.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n';
import NotFound from '@/pages/NotFound';

// Success.tsx pulls in supabase + UserStatus + Profile via its verification effect.
// The document.title effect is independent of all of that, so we stub the heavy deps
// to nothing and let the REAL component's title effect run.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }), getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: new Error('no-net') }) },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));
vi.mock('@/contexts/UserStatusContext', () => ({ useUserStatus: () => ({ invalidateCache: vi.fn() }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ refetch: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import Success from '@/pages/Success';

const renderAt = (ui: React.ReactElement, path = '/') =>
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

describe('F-036: /success + /404 set a correct i18n document.title', () => {
  beforeEach(async () => {
    document.title = 'STALE FROM PREVIOUS PAGE';
    await i18n.changeLanguage('en');
  });
  afterEach(() => {
    cleanup();
    document.title = '';
  });

  it('NotFound sets an EN title with the brand suffix', async () => {
    renderAt(<NotFound />, '/does-not-exist');
    await waitFor(() => expect(document.title).toBe('Page Not Found | Bookings Assistant'));
  });

  it('NotFound follows the EN<->NL toggle', async () => {
    renderAt(<NotFound />, '/does-not-exist');
    await waitFor(() => expect(document.title).toBe('Page Not Found | Bookings Assistant'));
    await i18n.changeLanguage('nl');
    await waitFor(() => expect(document.title).toBe('Pagina niet gevonden | Bookings Assistant'));
  });

  it('Success sets an EN title with the brand suffix', async () => {
    renderAt(<Success />, '/success?session_id=cs_test_x');
    await waitFor(() => expect(document.title).toBe('Payment Successful | Bookings Assistant'));
  });

  it('Success follows the EN<->NL toggle', async () => {
    renderAt(<Success />, '/success?session_id=cs_test_x');
    await waitFor(() => expect(document.title).toBe('Payment Successful | Bookings Assistant'));
    await i18n.changeLanguage('nl');
    await waitFor(() => expect(document.title).toBe('Betaling geslaagd | Bookings Assistant'));
  });
});
