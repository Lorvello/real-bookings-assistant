// DEV-ONLY no-auth visual harness for the main Calendar view (launch-ready-loop
// §7, Ronde 19 — Calendar premium, esp. mobile). The calendar VIEWS
// (ModernMonthView / WeekView / YearView) + both detail modals are PURE props,
// and CalendarHeader's only hook dependency is useAccessControl -> useUserStatus,
// so we mount the REAL CalendarHeader + REAL views + REAL modals against a mock
// UserStatusContext value (no Supabase/auth). This mirrors CalendarContainer's
// card wrapper. Not part of the production build.
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { UserStatusContext } from '@/contexts/UserStatusContext';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarContent } from '@/components/calendar/CalendarContent';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';

type View = 'month' | 'week' | 'year';

// --- mock UserStatusContext value (active subscriber, full access) ----------
const mockUserStatusValue: any = {
  userStatus: { userType: 'active_subscriber', isExpired: false, needsUpgrade: false, statusMessage: 'Active' },
  accessControl: { canCreateBookings: true, canEditBookings: true },
  isLoading: false,
  invalidateCache: async () => {},
};

// --- mock bookings ----------------------------------------------------------
function at(dayOffset: number, h: number, m: number, durationMin: number) {
  const start = new Date();
  start.setDate(start.getDate() + dayOffset);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + durationMin * 60000);
  return { start: start.toISOString(), end: end.toISOString() };
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const cal = { id: 'c1', name: 'Glow Studio — Main', color: '#22AB72', users: { full_name: 'Mathew Groen' } };

const mockBookings: any[] = [
  // Today — two appointments (multi-booking day + week-grid blocks)
  { id: 'b1', ...mapTimes(at(0, 9, 0, 60)), customer_name: 'Anna de Vries', customer_phone: '+31 6 12345678', customer_email: 'anna@example.com', status: 'confirmed', total_price: 45, service_types: { name: 'Haircut & style', color: '#22AB72', duration: 60 }, calendar: cal },
  { id: 'b2', ...mapTimes(at(0, 13, 30, 30)), customer_name: 'Youssef El Amrani', status: 'pending', service_types: { name: 'Consultation', color: '#F0BC3D', duration: 30 }, calendar: cal, notes: 'First-time client, wants a colour assessment.' },
  // Light-coloured service — proves contrast-safe chip (white text used to fail here)
  { id: 'b3', ...mapTimes(at(1, 10, 0, 45)), customer_name: 'Sophie Bakker', customer_phone: '+31 6 22223333', status: 'confirmed', total_price: 30, service_types: { name: 'Manicure', color: '#FDE68A', duration: 45 }, calendar: cal },
  // Single booking on another day
  { id: 'b4', ...mapTimes(at(3, 15, 0, 90)), customer_name: 'Liam Janssen', status: 'completed', total_price: 120, service_types: { name: 'Full colour', color: '#8B5CF6', duration: 90 }, calendar: cal },
  { id: 'b5', ...mapTimes(at(0, 16, 0, 30)), customer_name: 'Emma Visser', status: 'cancelled', service_types: { name: 'Trim', color: '#38BDF8', duration: 30 }, calendar: cal },
  { id: 'b6', ...mapTimes(at(-2, 11, 0, 60)), customer_name: 'Noah Smit', status: 'confirmed', total_price: 50, service_types: { name: 'Beard trim', color: '#22AB72', duration: 60 }, calendar: cal },
];

function mapTimes(t: { start: string; end: string }) {
  return { start_time: t.start, end_time: t.end };
}

function Harness() {
  const [view, setView] = useState<View>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState({ startTime: '08:00', endTime: '18:00' });

  // brief loading flash to eyeball the hairline
  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(id);
  }, [view]);

  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
      <UserStatusContext.Provider value={mockUserStatusValue}>
        <div className="dark main-scrollbar h-screen overflow-y-auto bg-background p-2 sm:p-3 md:p-8">
          <div className="mx-auto max-w-6xl space-y-1 sm:space-y-2 md:space-y-6">
            <SimplePageHeader title="Glow Studio — Main" />

            {/* mirrors CalendarContainer's card */}
            <div className="surface-raised flex h-[78vh] max-h-full flex-col overflow-hidden rounded-xl">
              <CalendarHeader
                currentView={view}
                currentDate={currentDate}
                onViewChange={setView}
                onNavigate={(dir) =>
                  setCurrentDate((d) => {
                    const n = new Date(d);
                    const delta = view === 'year' ? 365 : view === 'week' ? 7 : 30;
                    n.setDate(n.getDate() + (dir === 'next' ? delta : -delta));
                    return n;
                  })
                }
                onToday={() => setCurrentDate(new Date())}
                onNewBooking={() => alert('New appointment (harness)')}
                loading={loading}
                timeRange={timeRange}
                onTimeRangeChange={(startTime, endTime) => setTimeRange({ startTime, endTime })}
              />

              <div className="relative z-10 min-h-0 flex-1 overflow-auto">
                <CalendarContent
                  currentView={view}
                  bookings={mockBookings}
                  currentDate={currentDate}
                  loading={loading}
                  timeRange={timeRange}
                  viewingAllCalendars
                />
              </div>
            </div>
          </div>
        </div>
        <Toaster />
      </UserStatusContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
