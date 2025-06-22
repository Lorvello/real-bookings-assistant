
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Clock, User, Phone, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  onBookingClick?: (booking: Booking) => void;
}

export function DayBookingsModal({ open, onClose, date, bookings, onBookingClick }: DayBookingsModalProps) {
  if (!date) return null;

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Afspraken voor {format(date, 'EEEE d MMMM yyyy', { locale: nl })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {sortedBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen afspraken voor deze dag
            </div>
          ) : (
            sortedBookings.map((booking) => (
              <div
                key={booking.id}
                className="p-4 rounded-lg border border-border/60 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer hover:shadow-md"
                onClick={() => handleBookingClick(booking)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: booking.service_types?.color || '#10B981'
                        }}
                      />
                      <h3 className="font-semibold text-foreground">
                        {booking.service_types?.name || booking.service_name || 'Afspraak'}
                      </h3>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.status === 'confirmed' ? 'Bevestigd' :
                         booking.status === 'pending' ? 'In behandeling' :
                         'Geannuleerd'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(new Date(booking.start_time), 'HH:mm')} - 
                          {format(new Date(booking.end_time), 'HH:mm')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{booking.customer_name}</span>
                      </div>

                      {booking.customer_phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{booking.customer_phone}</span>
                        </div>
                      )}

                      {booking.customer_email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{booking.customer_email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-muted-foreground text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  Klik voor meer details
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
