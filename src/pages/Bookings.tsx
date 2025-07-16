
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useOptimizedBookings } from '@/hooks/useOptimizedBookings';
import { useBookingsFilters } from '@/hooks/useBookingsFilters';
import { BookingDetailModal } from '@/components/calendar/BookingDetailModal';
import { BookingsHeader } from '@/components/bookings/BookingsHeader';
import { BookingsFilters } from '@/components/bookings/BookingsFilters';
import { BookingsList } from '@/components/bookings/BookingsList';
import { SetupIncompleteOverlay } from '@/components/onboarding/SetupIncompleteOverlay';

const Bookings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCalendar, calendars, getActiveCalendarIds, loading: calendarsLoading } = useCalendarContext();
  const { userStatus } = useUserStatus();
  
  // Get primary calendar for bookings
  const activeCalendarIds = getActiveCalendarIds();
  const primaryCalendarId = activeCalendarIds.length > 0 ? activeCalendarIds[0] : undefined;
  
  const { bookings, loading: bookingsLoading } = useOptimizedBookings(primaryCalendarId);
  
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
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Loading...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (calendars.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <div className="text-lg text-gray-300">No calendar found</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-3 md:p-8">
        <div className="space-y-4 md:space-y-6">
          <BookingsHeader />

          {userStatus.isSetupIncomplete ? (
            <SetupIncompleteOverlay>
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
              />
            </SetupIncompleteOverlay>
          ) : (
            <>
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
              />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Bookings;
