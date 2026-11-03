import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));
vi.mock('@/hooks/useSubscriptionTiers', () => ({
  useSubscriptionTiers: () => ({ tiers: [], isLoading: false }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));
vi.mock('@/utils/stripeConfig', () => ({ isTestMode: () => true, getPriceId: () => null }));
vi.mock('@/components/EnterpriseContactForm', () => ({ EnterpriseContactForm: () => null }));

import { SubscriptionModal } from '@/components/SubscriptionModal';

describe('SubscriptionModal Enterprise price display', () => {
  it('shows custom pricing in both layouts without changing the regular monthly prices', () => {
    render(<SubscriptionModal isOpen onClose={() => {}} userType="trial" />);

    expect(screen.getAllByText('Custom pricing')).toHaveLength(2);
    expect(screen.queryByText(/From €300/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/intelligent reminder sequences/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Monthly' }));
    expect(screen.getAllByText('€30').length).toBeGreaterThan(0);
    expect(screen.getAllByText('€60').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Choose Plan/i })).toHaveLength(6);
  });
});
