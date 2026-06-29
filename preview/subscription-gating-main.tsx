// DEV-ONLY no-auth visual harness for the SaaS SUBSCRIPTION PAYWALL + TIER-GATING
// surfaces (Stripe-Completeness loop, S3). Mounts the REAL components (no copy, no
// drift):
//   - SubscriptionModal  ........ the full-screen upgrade paywall a Free / lapsed
//                                  user hits (3 tiers, monthly/yearly, tooltips).
//   - ui/UpgradePrompt ........... the "limit reached" gating card (Free = 1 cal).
//   - CalendarUpgradeModal ....... tier-gating dialog (create-calendar blocked).
//   - WhatsAppUpgradeModal ....... tier-gating dialog (WhatsApp-AI locked on Free).
//
// SubscriptionModal needs useSubscriptionTiers (React-Query) + useToast; the gating
// modals need useUserStatus. We seed the ['subscription-tiers'] query cache with the
// real 3 tiers and provide a mock UserStatusContext value (raw context exported for
// the harness), so every surface renders FULLY without auth, in EN and NL. Not part
// of the production build (rollup input is index.html only); served by `vite` dev at
// /preview/subscription-gating.html.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import '@/i18n'; // bootstrap i18n so NL renders in this standalone harness
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { CalendarUpgradeModal } from '@/components/calendar-switcher/CalendarUpgradeModal';
import { WhatsAppUpgradeModal } from '@/components/calendar-settings/WhatsAppUpgradeModal';
import { UserStatusContext } from '@/contexts/UserStatusContext';
import type { UserStatus, AccessControl } from '@/types/userStatus';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

// Seed the real subscription tiers so SubscriptionModal renders all 3 cards offline.
const TIERS = [
  {
    id: 'tier-starter', tier_name: 'starter', display_name: 'Starter',
    description: 'For solo practitioners getting started',
    max_calendars: 2, max_bookings_per_month: null, max_team_members: 1, max_whatsapp_contacts: null,
    api_access: false, white_label: false, priority_support: false,
    price_monthly: 30, price_yearly: 288, features: [], is_active: true,
    created_at: '', updated_at: '',
    stripe_test_monthly_price_id: 'price_test_starter_m', stripe_test_yearly_price_id: 'price_test_starter_y',
    stripe_live_monthly_price_id: 'price_live_starter_m', stripe_live_yearly_price_id: 'price_live_starter_y',
  },
  {
    id: 'tier-professional', tier_name: 'professional', display_name: 'Professional',
    description: 'For growing teams and multi-location',
    max_calendars: null, max_bookings_per_month: null, max_team_members: 10, max_whatsapp_contacts: null,
    api_access: false, white_label: false, priority_support: true,
    price_monthly: 60, price_yearly: 576, features: [], is_active: true,
    created_at: '', updated_at: '',
    stripe_test_monthly_price_id: 'price_test_pro_m', stripe_test_yearly_price_id: 'price_test_pro_y',
    stripe_live_monthly_price_id: 'price_live_pro_m', stripe_live_yearly_price_id: 'price_live_pro_y',
  },
  {
    id: 'tier-enterprise', tier_name: 'enterprise', display_name: 'Enterprise',
    description: 'Custom pricing for large organizations',
    max_calendars: null, max_bookings_per_month: null, max_team_members: 999, max_whatsapp_contacts: null,
    api_access: true, white_label: true, priority_support: true,
    price_monthly: 300, price_yearly: 3600, features: [], is_active: true,
    created_at: '', updated_at: '',
  },
];
queryClient.setQueryData(['subscription-tiers'], TIERS);

// A lapsed Free tenant: 1 calendar, no WhatsApp-AI (matches the freemium-downgrade
// access model proven in S2). Drives the gating modals + the UpgradePrompt.
const FREE_ACCESS: AccessControl = {
  canViewDashboard: true, canCreateBookings: true, canEditBookings: true, canManageSettings: true,
  canAccessWhatsApp: false, canAccessBookingAssistant: false, canUseAI: false, canExportData: false,
  canInviteUsers: false, canAccessAPI: false, canUseWhiteLabel: false, hasPrioritySupport: false,
  canAccessFutureInsights: false, canAccessBusinessIntelligence: false, canAccessPerformance: false,
  canAccessCustomerSatisfaction: false, canAccessTeamMembers: false, canAccessTaxCompliance: false,
  maxCalendars: 1, maxBookingsPerMonth: null, maxTeamMembers: 1, maxWhatsAppContacts: 0,
};
const FREE_STATUS: UserStatus = {
  userType: 'expired_trial', isTrialActive: false, isExpired: true, isSubscriber: false,
  isCanceled: false, hasFullAccess: false, daysRemaining: 0, gracePeriodActive: false,
  needsUpgrade: true, canEdit: true, canCreate: false, showUpgradePrompt: true,
  statusMessage: '', statusColor: 'red', isSetupIncomplete: false, isStatusLoading: false,
};
const mockUserStatusValue = {
  userStatus: FREE_STATUS,
  accessControl: FREE_ACCESS,
  isLoading: false,
  invalidateCache: async () => {},
};

function Harness() {
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);

  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <UserStatusContext.Provider value={mockUserStatusValue}>
          <div className="dark main-scrollbar min-h-screen bg-background p-4 text-foreground md:p-8">
            <div className="mx-auto max-w-3xl space-y-8">
              <header>
                <h1 className="text-2xl font-semibold tracking-tight">Subscription paywall + tier-gating (S3 harness)</h1>
                <p className="mt-1 text-sm text-muted-foreground">Free tenant: 1 calendar, no WhatsApp-AI. Open each surface to review premium + EN/NL + a11y.</p>
              </header>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setPaywallOpen(true)}>Open upgrade paywall (SubscriptionModal)</Button>
                <Button variant="outline" onClick={() => setCalOpen(true)}>Open calendar-gating modal</Button>
                <Button variant="outline" onClick={() => setWaOpen(true)}>Open WhatsApp-AI gating modal</Button>
              </div>

              {/* Inline limit-reached gating card (Free = 1 calendar) */}
              <div className="max-w-md">
                <UpgradePrompt
                  feature="Calendars"
                  currentUsage="1 of 1"
                  limit="1 calendar"
                  description="Your Free plan includes a single calendar. Upgrade to add more and unlock the WhatsApp assistant."
                />
              </div>
            </div>
          </div>

          <SubscriptionModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} userType="expired_trial" />
          <CalendarUpgradeModal open={calOpen} onOpenChange={setCalOpen} />
          <WhatsAppUpgradeModal isOpen={waOpen} onClose={() => setWaOpen(false)} userType="expired_trial" />

          <Toaster />
        </UserStatusContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
