// DEV-ONLY no-auth visual harness for the Conversations / WhatsApp surface
// (launch-ready-loop §7, Ronde 21 — Conversations premium). The live 3-pane
// (ContactListSidebar + ConversationDetailPanel) is hook-bound
// (useWhatsAppContactOverview / useWhatsAppMessages react-query), so we seed the
// cache (staleTime Infinity, refetchOnMount false) and mount the REAL pure
// children directly (R15 trick) — no auth, no Supabase. WhatsAppServiceStatus is
// shown via a mock UserStatusContext to review the inactive-service state.
// Not part of the production build.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthContext } from '@/contexts/AuthContext';
import { UserStatusContext } from '@/contexts/UserStatusContext';
import { ContactListSidebar } from '@/components/whatsapp/ContactListSidebar';
import { ConversationDetailPanel } from '@/components/whatsapp/ConversationDetailPanel';
import { WhatsAppServiceStatus } from '@/components/whatsapp/WhatsAppServiceStatus';

const CAL_ID = 'cal-1';

const iso = (hoursFromNow: number) => {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow);
  return d.toISOString();
};

const contacts: any[] = [
  {
    contact_id: 'c-1',
    phone_number: '+31 6 18 84 22 19',
    display_name: 'Emma van der Berg',
    first_name: 'Emma',
    last_name: 'van der Berg',
    conversation_status: 'active',
    last_message_at: iso(-0.3),
    conversation_created_at: iso(-24 * 9),
    all_bookings: [
      {
        booking_id: 'b-1', calendar_id: CAL_ID, calendar_name: 'Glow Studio — Main',
        business_name: 'Glow Studio', start_time: iso(48), end_time: iso(49),
        service_type_id: 's-1', service_name: 'Cut & Style', status: 'confirmed',
        customer_name: 'Emma van der Berg', customer_email: null,
      },
      {
        booking_id: 'b-2', calendar_id: CAL_ID, calendar_name: 'Glow Studio — Main',
        business_name: 'Glow Studio', start_time: iso(-24 * 14), end_time: iso(-24 * 14 + 1),
        service_type_id: 's-2', service_name: 'Balayage', status: 'completed',
        customer_name: 'Emma van der Berg', customer_email: null,
      },
    ],
  },
  {
    contact_id: 'c-2',
    phone_number: '+31 6 24 55 90 03',
    display_name: 'Lars Janssen',
    first_name: 'Lars',
    conversation_status: 'pending',
    last_message_at: iso(-3),
    conversation_created_at: iso(-24 * 2),
    all_bookings: [
      {
        booking_id: 'b-3', calendar_id: CAL_ID, calendar_name: 'Glow Studio — Main',
        business_name: 'Glow Studio', start_time: iso(72), end_time: iso(73),
        service_type_id: 's-1', service_name: 'Beard Trim', status: 'pending',
        customer_name: 'Lars Janssen', customer_email: null,
      },
    ],
  },
  {
    contact_id: 'c-3',
    phone_number: '+31 6 91 02 77 41',
    display_name: 'Sofia Martens',
    conversation_status: 'closed',
    last_message_at: iso(-24 * 4),
    conversation_created_at: iso(-24 * 30),
    all_bookings: [
      {
        booking_id: 'b-4', calendar_id: CAL_ID, calendar_name: 'Glow Studio — Main',
        business_name: 'Glow Studio', start_time: iso(-24 * 3), end_time: iso(-24 * 3 + 1),
        service_type_id: 's-3', service_name: 'Manicure', status: 'cancelled',
        customer_name: 'Sofia Martens', customer_email: null,
      },
    ],
  },
];

const messages: any[] = [
  { id: 'm-1', content: 'Hi! Do you have a slot for a cut this week?', direction: 'inbound', created_at: iso(-2), status: 'delivered' },
  { id: 'm-2', content: 'Hello Emma! Of course. We have Thursday at 14:00 or Friday at 10:30 — which works best for you?', direction: 'outbound', created_at: iso(-2), status: 'delivered' },
  { id: 'm-3', content: 'Thursday 14:00 is perfect.', direction: 'inbound', created_at: iso(-1.9), status: 'delivered' },
  { id: 'm-4', content: "Great — you're booked for a Cut & Style on Thursday at 14:00. See you then! 💇", direction: 'outbound', created_at: iso(-1.9), status: 'delivered' },
];

function makeClient() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false },
    },
  });
  qc.setQueryData(['whatsapp-contact-overview', CAL_ID, true], contacts);
  qc.setQueryData(['whatsapp-messages', 'c-1'], messages);
  return qc;
}

const mockAuthValue: any = {
  user: { id: 'u-owner', email: 'owner@glowstudio.example' },
  session: { user: { id: 'u-owner' } },
  loading: false,
  isAuthenticated: true,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {},
};

const inactiveUserStatus: any = {
  userStatus: { userType: 'expired_trial', isExpired: true, isSetupIncomplete: false, needsUpgrade: true, statusMessage: 'Trial expired' },
  accessControl: { canAccessWhatsApp: false },
  isLoading: false,
  invalidateCache: async () => {},
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-10 px-1 first:mt-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">{children}</span>
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ color: '#f88', background: '#1a1a1a', padding: 16, whiteSpace: 'pre-wrap', fontSize: 12 }}>
          {String(this.state.error.stack || this.state.error.message)}
        </pre>
      );
    }
    return this.props.children;
  }
}

function Harness() {
  const qc = React.useMemo(makeClient, []);
  return (
    <ErrorBoundary>
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <QueryClientProvider client={qc}>
            <div className="dark main-scrollbar h-screen overflow-y-auto bg-background">
              <div className="mx-auto max-w-6xl px-3 py-6">
                <SectionLabel>Populated 3-pane — contact list + conversation detail</SectionLabel>
                <ErrorBoundary>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[640px]">
                    <div className="h-[320px] lg:h-full lg:col-span-4">
                      <ContactListSidebar
                        contacts={contacts}
                        selectedContactId="c-1"
                        onSelectContact={() => {}}
                        isLoading={false}
                      />
                    </div>
                    <div className="h-[640px] lg:h-full lg:col-span-8">
                      <ConversationDetailPanel contact={contacts[0]} calendarId={CAL_ID} />
                    </div>
                  </div>
                </ErrorBoundary>

                <SectionLabel>Empty contact list (premium empty state)</SectionLabel>
                <ErrorBoundary>
                  <div className="h-[320px] max-w-sm">
                    <ContactListSidebar contacts={[]} selectedContactId={null} onSelectContact={() => {}} isLoading={false} />
                  </div>
                </ErrorBoundary>

                <SectionLabel>Service inactive (expired trial) — WhatsAppServiceStatus</SectionLabel>
                <ErrorBoundary>
                  <UserStatusContext.Provider value={inactiveUserStatus}>
                    <WhatsAppServiceStatus calendarId={CAL_ID} />
                  </UserStatusContext.Provider>
                </ErrorBoundary>
              </div>
            </div>
            <Toaster />
          </QueryClientProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
