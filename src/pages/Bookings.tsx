
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useBookingsWithCalendarFilter } from '@/hooks/useBookingsWithCalendarFilter';
import { useBookingsFilters } from '@/hooks/useBookingsFilters';
import { BookingDetailModal } from '@/components/calendar/BookingDetailModal';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { BookingsFilters } from '@/components/bookings/BookingsFilters';
import { BookingsList } from '@/components/bookings/BookingsList';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { DashboardLoadingScreen } from '@/components/dashboard/DashboardLoadingScreen';

const Bookings = () => {
  const { t } = useTranslation('appPages');
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCalendar, calendars, getActiveCalendarIds, loading: calendarsLoading } = useCalendarContext();
  
  // Get active calendar IDs for filtering bookings
  const activeCalendarIds = getActiveCalendarIds();
  
  const { bookings, loading: bookingsLoading, refetch: refetchBookings } = useBookingsWithCalendarFilter(activeCalendarIds);
  
  const {
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    sortBy,
    setSortBy,
    filteredAndSortedBookings
  } = useBookingsFilters(bookings);

  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const handleBookingClick = (booking: any) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  const hasFilters = searchTerm !== '';

  if (authLoading || calendarsLoading) {
    return (
      <DashboardLayout>
        <DashboardLoadingScreen />
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (calendars.length === 0) {
    return (
      <DashboardLayout>
        <div className="bg-background min-h-full p-1 md:p-8">
          <div className="space-y-1 md:space-y-6">
            <SimplePageHeader title={t('bookPage.pageTitle', 'Bookings')} />

            {/* Create Calendar Section */}
            <div className="surface-raised rounded-xl p-8">
              <div className="text-center space-y-6">
                <div className="glow-accent relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                  <CalendarIcon aria-hidden="true" className="h-6 w-6 text-accent-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">{t('bookPage.noCalendarHeading', 'Create your first calendar')}</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {t('bookPage.noCalendarDescription', 'You need a calendar before you can manage bookings. Create one to get started.')}
                  </p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)} size="lg" className="gap-2">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {t('bookPage.createCalendarButton', 'Create calendar')}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <CreateCalendarDialog 
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-background min-h-full p-4 sm:p-6 md:p-8">
        <div className="space-y-4 md:space-y-6">
          <SimplePageHeader title={t('bookPage.pageTitle', 'Bookings')} />

          {/* Calendar Switcher */}
          <div className="mb-4 md:mb-6">
            <CalendarSwitcher />
          </div>

          <BookingsFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            dateRange={dateRange}
            setDateRange={setDateRange}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />

          <BookingsList
            bookings={filteredAndSortedBookings}
            loading={bookingsLoading}
            hasFilters={hasFilters}
            onBookingClick={handleBookingClick}
          />

          <BookingDetailModal
            open={isModalOpen}
            onClose={handleCloseModal}
            booking={selectedBooking}
            onActed={() => { void refetchBookings(); }}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Bookings;
