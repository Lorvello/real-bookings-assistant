import { format } from 'date-fns';
import { STATUS_COLORS, BOOKING_STATUS_COLORS } from '@/lib/colors';

export const formatDate = (dateString?: string) => {
  if (!dateString) return 'Nooit';
  return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
};

export const formatPhone = (phone: string) => {
  // Format phone number for better readability
  if (phone.startsWith('+31')) {
    return phone.replace('+31', '0').replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  return phone;
};

export const getStatusColor = (status?: string) => {
  switch (status) {
    case 'active': 
      return `bg-${STATUS_COLORS.active.bg} text-${STATUS_COLORS.active.text}`;
    case 'closed': 
      return `bg-${STATUS_COLORS.closed.bg} text-${STATUS_COLORS.closed.text}`;
    case 'archived': 
      return `bg-${STATUS_COLORS.archived.bg} text-${STATUS_COLORS.archived.text}`;
    default: 
      return `bg-${STATUS_COLORS.unknown.bg} text-${STATUS_COLORS.unknown.text}`;
  }
};

export const getBookingStatusColor = (status?: string) => {
  switch (status) {
    case 'confirmed': 
      return `bg-${BOOKING_STATUS_COLORS.confirmed.bg} text-${BOOKING_STATUS_COLORS.confirmed.text}`;
    case 'completed': 
      return `bg-${BOOKING_STATUS_COLORS.completed.bg} text-${BOOKING_STATUS_COLORS.completed.text}`;
    case 'cancelled': 
      return `bg-${BOOKING_STATUS_COLORS.cancelled.bg} text-${BOOKING_STATUS_COLORS.cancelled.text}`;
    case 'pending': 
      return `bg-${BOOKING_STATUS_COLORS.pending.bg} text-${BOOKING_STATUS_COLORS.pending.text}`;
    default: 
      return `bg-${BOOKING_STATUS_COLORS.default.bg} text-${BOOKING_STATUS_COLORS.default.text}`;
  }
};
