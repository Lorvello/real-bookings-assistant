
import { useState, useMemo } from 'react';
import { isWithinInterval, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { DateRange, getPresetRange } from '@/utils/dateRangePresets';

export interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  start_time: string;
  created_at?: string;
  [key: string]: any;
}

export const useBookingsFilters = (bookings: Booking[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    try {
      return getPresetRange('last30days');
    } catch (error) {
      console.error('Error getting preset range, using default:', error);
      const now = new Date();
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      return {
        startDate,
        endDate,
        preset: 'last30days',
        label: 'Last 30 days'
      };
    }
  });
  const [sortBy, setSortBy] = useState('newest');

  const filteredAndSortedBookings = useMemo(() => {
    let filtered = bookings.filter(booking => {
      // Search filter
      const matchesSearch = booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           booking.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (booking.customer_phone && booking.customer_phone.includes(searchTerm));
      
      if (!matchesSearch) return false;
      
      // Date range filter
      const bookingDate = new Date(booking.start_time);
      const isInDateRange = isWithinInterval(bookingDate, {
        start: dateRange.startDate,
        end: dateRange.endDate
      });
      
      return isInDateRange;
    });

    // Sort bookings
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || b.start_time).getTime() - new Date(a.created_at || a.start_time).getTime();
        case 'oldest':
          return new Date(a.created_at || a.start_time).getTime() - new Date(b.created_at || b.start_time).getTime();
        case 'alphabetical':
          return a.customer_name.localeCompare(b.customer_name);
        default:
          return 0;
      }
    });
  }, [bookings, searchTerm, dateRange, sortBy]);

  return {
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    sortBy,
    setSortBy,
    filteredAndSortedBookings
  };
};
