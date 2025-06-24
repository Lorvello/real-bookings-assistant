
import { useState, useMemo } from 'react';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';
import { enUS } from 'date-fns/locale';

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
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const filteredAndSortedBookings = useMemo(() => {
    let filtered = bookings.filter(booking => {
      // Search filter
      const matchesSearch = booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           booking.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (booking.customer_phone && booking.customer_phone.includes(searchTerm));
      
      if (!matchesSearch) return false;
      
      // Status filter
      if (filterStatus === 'today') {
        return isToday(new Date(booking.start_time));
      } else if (filterStatus === 'week') {
        return isThisWeek(new Date(booking.start_time), { locale: enUS });
      } else if (filterStatus === 'month') {
        return isThisMonth(new Date(booking.start_time));
      }
      
      return true;
    });

    // Sort bookings
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || b.start_time).getTime() - new Date(a.created_at || a.start_time).getTime();
        case 'date':
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        case 'customer':
          return a.customer_name.localeCompare(b.customer_name);
        default:
          return 0;
      }
    });
  }, [bookings, searchTerm, filterStatus, sortBy]);

  return {
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    filteredAndSortedBookings
  };
};
