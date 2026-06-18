// DEV-ONLY no-auth visual harness for the Settings surface (launch-ready-loop §7).
// Mounts the REAL Settings shell + tabs (no copy → no drift) against a mock
// SettingsContext + UserStatusContext, so the premium overhaul can be screenshotted
// and design-reviewed without typing a password or hitting live RLS data.
// Not part of the production build (rollup input is index.html only); served by
// `vite` dev at /preview/settings.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { SettingsContext, type SettingsContextType } from '@/contexts/SettingsContext';
import { UserStatusContext } from '@/contexts/UserStatusContext';
import { SettingsTabs } from '@/components/settings/SettingsLayout';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';

const mockProfile = {
  id: 'preview-user',
  full_name: 'Demo Owner',
  website: 'www.glowstudio.nl',
};

const mockBusiness = {
  business_name: 'Glow Studio',
  business_type: 'beauty_salon',
  business_description:
    'A calm boutique beauty studio in the heart of Amsterdam offering facials, lash and brow treatments by appointment.',
  business_email: 'hello@glowstudio.nl',
  business_phone: '+31 6 12345678',
  business_street: 'Prinsengracht',
  business_number: '42',
  business_postal: '1015 DV',
  business_city: 'Amsterdam',
  business_country: 'Netherlands',
  cancellation_policy:
    'Free cancellation up to 24h before your appointment. Later cancellations or no-shows are charged 50%. Rescheduling is free anytime.',
  payment_info:
    'Pay in the studio by card or cash. A 20% deposit confirms appointments over €100.',
  preparation_info: '',
  parking_info: '',
  public_transport_info: '',
  accessibility_info: '',
  other_info: '',
};

const settingsValue: SettingsContextType = {
  profileData: mockProfile,
  setProfileData: () => {},
  businessData: mockBusiness,
  setBusinessData: () => {},
  loading: false,
  isLoading: false,
  loadError: null,
  saveError: null,
  saveFields: async () => {
    await new Promise((r) => setTimeout(r, 700));
    return true;
  },
  refetch: async () => {},
};

const userStatusValue: any = {
  userStatus: { isSetupIncomplete: false },
};

class Boundary extends React.Component<{ children: React.ReactNode }, { err?: Error }> {
  state: { err?: Error } = { err: undefined };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    return this.state.err ? (
      <div className="rounded-xl border border-white/[0.08] bg-card p-8 text-sm text-muted-foreground">
        This tab isn't part of this iteration yet ({String(this.state.err.message)}).
      </div>
    ) : (
      this.props.children
    );
  }
}

function Harness() {
  return (
    <MemoryRouter>
      <UserStatusContext.Provider value={userStatusValue}>
        <SettingsContext.Provider value={settingsValue}>
          <div className="dark main-scrollbar h-screen overflow-y-auto bg-background p-3 md:p-8">
            <div className="mx-auto max-w-6xl">
              <SimplePageHeader title="Settings" />
              <div className="mt-6 md:mt-8">
                <Boundary>
                  <SettingsTabs />
                </Boundary>
              </div>
            </div>
          </div>
          <Toaster />
        </SettingsContext.Provider>
      </UserStatusContext.Provider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
