
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Clock, User, Phone, Mail, X } from 'lucide-react';
import { useEffect } from 'react';

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  status: string;
  service_name?: string;
  notes?: string;
  internal_notes?: string;
  total_price?: number;
  service_types?: {
    name: string;
    color: string;
    duration: number;
    description?: string;
  } | null;
}

interface DayBookingsModalProps {
  open: boolean;
  onClose: () => void;
  date: Date | null;
  bookings: Booking[];
  onBookingClick?: (booking: Booking, event?: React.MouseEvent) => void;
  position?: { x: number; y: number };
}

export function DayBookingsModal({ open, onClose, date, bookings, onBookingClick, position }: DayBookingsModalProps) {
  if (!date || !open) return null;

  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const handleBookingClick = (booking: Booking) => {
    if (onBookingClick) {
      onBookingClick(booking);
      onClose(); // Close this modal when opening booking detail
    }
  };

  return (
    <div 
      data-popup="true"
      className="absolute z-50 bg-card/95 backdrop-blur-sm border border-border/40 rounded-lg shadow-lg"
      style={{
        left: `${position?.x || 0}px`,
        top: `${position?.y || 0}px`,
        transform: 'translateX(-50%) translateY(-100%)',
        minWidth: '240px',
        maxWidth: '280px',
      }}
    >
      {/* Header */}
      <div className="p-3 border-b border-border/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {format(date, 'EEE d MMM', { locale: enUS })}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted/50 rounded-sm transition-colors"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 max-h-64 overflow-y-auto">
        {sortedBookings.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-xs">
            No appointments
          </div>
        ) : (
          <div className="space-y-2">
            {sortedBookings.map((booking) => (
              <div
                key={booking.id}
                className="p-2 rounded-md border border-border/30 bg-card/30 hover:bg-card/50 transition-colors cursor-pointer"
                onClick={() => handleBookingClick(booking)}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                    style={{
                      backgroundColor: booking.service_types?.color || '#3B82F6'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">
                      {booking.service_types?.name || booking.service_name || 'Appointment'}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(booking.start_time), 'HH:mm')} - 
                        {format(new Date(booking.end_time), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">
                        {booking.customer_name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
