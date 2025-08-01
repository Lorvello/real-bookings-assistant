
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { X, Clock, User, Phone, Mail, Calendar, MapPin, FileText } from 'lucide-react';
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
  calendar?: {
    id?: string;
    name: string;
    color: string;
    user_id?: string;
    users?: {
      full_name: string;
    };
  };
  service_types?: {
    name: string;
    color: string;
    duration: number;
    description?: string;
  } | null;
}

interface BookingDetailModalProps {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  viewingAllCalendars?: boolean;
}

export function BookingDetailModal({ open, onClose, booking, viewingAllCalendars = false }: BookingDetailModalProps) {
  if (!booking) return null;

  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'no-show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      case 'completed':
        return 'Completed';
      case 'no-show':
        return 'No Show';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-xl font-semibold flex items-center gap-2 sm:gap-3">
            <div
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
              style={{
                backgroundColor: booking.service_types?.color || '#10B981'
              }}
            />
            Appointment Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-6">
          {/* Service Information */}
          <div className="bg-gradient-to-r from-card to-card/50 rounded-lg p-2 sm:p-4 border">
            <h3 className="text-sm sm:text-lg font-semibold text-foreground mb-1 sm:mb-2">
              {booking.service_types?.name || booking.service_name || 'Appointment'}
            </h3>
            {booking.service_types?.description && (
              <p className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-3">
                {booking.service_types.description}
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className={`px-2 py-1 sm:px-3 rounded-full border font-medium text-xs ${getStatusColor(booking.status)}`}>
                {getStatusLabel(booking.status)}
              </div>
              {booking.total_price && (
                <div className="text-primary font-semibold text-xs sm:text-sm">
                  €{booking.total_price.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Calendar Information */}
          {booking.calendar && (
            <div className="bg-card/50 rounded-lg p-2 sm:p-4 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1 sm:mb-2">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-medium text-xs sm:text-sm">Calendar</span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                    style={{ backgroundColor: booking.calendar.color }}
                  />
                  <span className="font-semibold text-foreground text-xs sm:text-sm">
                    {booking.calendar.name}
                  </span>
                </div>
                {booking.calendar.users?.full_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-2 h-2 sm:w-3 sm:h-3" />
                    <span className="text-xs sm:text-sm">
                      {booking.calendar.users.full_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Time & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-card/50 rounded-lg p-2 sm:p-4 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1 sm:mb-2">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-medium text-xs sm:text-sm">Date & Time</span>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <div className="font-semibold text-foreground text-xs sm:text-sm">
                  {format(startTime, 'EEEE d MMMM yyyy', { locale: enUS })}
                </div>
                <div className="text-muted-foreground text-xs sm:text-sm">
                  {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                </div>
              </div>
            </div>

            <div className="bg-card/50 rounded-lg p-2 sm:p-4 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1 sm:mb-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-medium text-xs sm:text-sm">Duration</span>
              </div>
              <div className="font-semibold text-foreground text-xs sm:text-sm">
                {duration} minutes
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-card/50 rounded-lg p-2 sm:p-4 border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2 sm:mb-3">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-medium text-xs sm:text-sm">Customer Information</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
              <div>
                <div className="font-semibold text-foreground mb-1 text-xs sm:text-sm">
                  {booking.customer_name}
                </div>
                {booking.customer_email && (
                  <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground text-xs sm:text-sm">
                    <Mail className="w-2 h-2 sm:w-3 sm:h-3" />
                    <span>{booking.customer_email}</span>
                  </div>
                )}
              </div>
              {booking.customer_phone && (
                <div>
                  <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground text-xs sm:text-sm">
                    <Phone className="w-2 h-2 sm:w-3 sm:h-3" />
                    <span>{booking.customer_phone}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {(booking.notes || booking.internal_notes) && (
            <div className="bg-card/50 rounded-lg p-2 sm:p-4 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2 sm:mb-3">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-medium text-xs sm:text-sm">Notes</span>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {booking.notes && (
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                      Customer notes:
                    </div>
                    <div className="text-xs sm:text-sm text-foreground bg-background/50 rounded p-2">
                      {booking.notes}
                    </div>
                  </div>
                )}
                {booking.internal_notes && (
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                      Internal notes:
                    </div>
                    <div className="text-xs sm:text-sm text-foreground bg-background/50 rounded p-2">
                      {booking.internal_notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
