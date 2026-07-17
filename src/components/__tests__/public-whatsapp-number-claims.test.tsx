import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@/components/ScrollAnimatedSection', () => ({
  default: ({ children, as: Element = 'div' }: { children: React.ReactNode; as?: React.ElementType }) => (
    <Element>{children}</Element>
  ),
}));

vi.mock('@/components/EnterpriseContactForm', () => ({
  EnterpriseContactForm: () => null,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open?: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="subscription-modal">{children}</div>
  ),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useSubscriptionTiers', () => ({
  useSubscriptionTiers: () => ({
    tiers: [
      { tier_name: 'starter' },
      { tier_name: 'professional' },
      { tier_name: 'enterprise' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/utils/stripeConfig', () => ({
  isTestMode: () => true,
  getPriceId: () => 'price_test',
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { Pricing } from '@/components/Pricing';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import StepTwoDetails from '@/components/how-it-works/StepTwoDetails';

const strongClaims = [
  /get your WhatsApp number instantly/i,
  /instant WhatsApp number assignment/i,
  /instant number assignment/i,
  /assigned immediately upon account creation/i,
  /number assigned/i,
  /\+31 6 12345678/,
];

const unprovenEnterpriseClaims = [
  /intelligent voice call routing & distribution/i,
  /omnichannel social media DM orchestration/i,
  /advanced reputation management & review analytics/i,
];

const renderPublicClaims = () =>
  render(
    <MemoryRouter>
      <StepTwoDetails />
      <Pricing />
      <SubscriptionModal isOpen onClose={vi.fn()} userType="trial" />
    </MemoryRouter>,
  );

describe('public WhatsApp-number provisioning claims across pages', () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ['false', 'false'],
    ['unset', undefined],
  ])('removes every strong claim when the capability is %s', (_state, value) => {
    vi.stubEnv('VITE_WHATSAPP_NUMBER_PROVISIONING_ENABLED', value);

    renderPublicClaims();

    for (const claim of strongClaims) {
      expect(screen.queryByText(claim)).not.toBeInTheDocument();
    }
    for (const claim of unprovenEnterpriseClaims) {
      expect(screen.queryByText(claim)).not.toBeInTheDocument();
    }
    expect(screen.getByText('Connect your WhatsApp Business number')).toBeInTheDocument();
    expect(screen.getAllByText(/using your WhatsApp Business number/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/number-provisioning option is confirmed separately/i)).not.toHaveLength(0);
    expect(within(screen.getByTestId('subscription-modal')).queryByText(/dedicated WhatsApp number/i)).not.toBeInTheDocument();
    expect(within(screen.getByTestId('subscription-modal')).getAllByText(/using your WhatsApp Business number/i)).not.toHaveLength(0);
  });

  it('shows the strong claims only when the capability is explicitly true', () => {
    vi.stubEnv('VITE_WHATSAPP_NUMBER_PROVISIONING_ENABLED', 'true');

    renderPublicClaims();

    for (const claim of strongClaims) {
      expect(screen.getAllByText(claim)).not.toHaveLength(0);
    }
    expect(screen.getAllByText(/provisioned WhatsApp number/i)).not.toHaveLength(0);
    expect(screen.queryByText(/dedicated WhatsApp number/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Connect your WhatsApp Business number')).not.toBeInTheDocument();
    expect(screen.queryByText(/using your WhatsApp Business number/i)).not.toBeInTheDocument();
    expect(within(screen.getByTestId('subscription-modal')).getAllByText(/provisioned WhatsApp number/i)).not.toHaveLength(0);
  });

  it('shows unsupported enterprise claims only behind their explicit flags', () => {
    vi.stubEnv('VITE_ENTERPRISE_VOICE_ROUTING_ENABLED', 'true');
    vi.stubEnv('VITE_ENTERPRISE_OMNICHANNEL_MESSAGING_ENABLED', 'true');
    vi.stubEnv('VITE_ENTERPRISE_REPUTATION_MANAGEMENT_ENABLED', 'true');

    renderPublicClaims();

    for (const claim of unprovenEnterpriseClaims) {
      expect(screen.getAllByText(claim)).not.toHaveLength(0);
    }
  });
});
