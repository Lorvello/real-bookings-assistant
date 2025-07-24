
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useBookingsWithCalendarFilter } from '@/hooks/useBookingsWithCalendarFilter';
import { useBookingsFilters } from '@/hooks/useBookingsFilters';
import { BookingDetailModal } from '@/components/calendar/BookingDetailModal';
import { BookingsHeader } from '@/components/bookings/BookingsHeader';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { BookingsFilters } from '@/components/bookings/BookingsFilters';
import { BookingsList } from '@/components/bookings/BookingsList';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';

const Bookings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCalendar, calendars, getActiveCalendarIds, loading: calendarsLoading } = useCalendarContext();
  
  // Get active calendar IDs for filtering bookings
  const activeCalendarIds = getActiveCalendarIds();
  
  const { bookings, loading: bookingsLoading } = useBookingsWithCalendarFilter(activeCalendarIds);
  
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
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
            <div className="text-base text-muted-foreground">Loading...</div>
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
        <div className="bg-gray-900 min-h-full p-3 md:p-8">
          <div className="space-y-4 md:space-y-6">
            <SimplePageHeader title="Bookings" />

            {/* Create Calendar Section */}
            <div className="bg-card border border-border shadow-sm rounded-lg p-8">
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Create Calendar to Manage Bookings</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    You need a calendar to start managing your bookings. Create one now to get started.
                  </p>
                </div>
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Calendar
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
      <div className="bg-gray-900 min-h-full p-3 md:p-8">
        <div className="space-y-4 md:space-y-6">
          <SimplePageHeader title="Bookings" />
          
          {/* Calendar Switcher */}
          <div className="mb-6">
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
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Bookings;
