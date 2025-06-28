
import { format } from 'date-fns';

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
    case 'active': return 'bg-green-100 text-green-800';
    case 'closed': return 'bg-gray-100 text-gray-800';
    case 'archived': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-600';
  }
};

export const getBookingStatusColor = (status?: string) => {
  switch (status) {
    case 'confirmed': return 'bg-blue-100 text-blue-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-600';
  }
};
