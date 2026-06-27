
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Clock, User, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { resolveBookingColor } from './utils/bookingColor';

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
  const { t } = useTranslation('appPages');
  if (!booking) return null;

  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-success/10 text-success-foreground ring-1 ring-success/20 border-transparent';
      case 'pending':
        return 'bg-warning/10 text-warning-foreground ring-1 ring-warning/20 border-transparent';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive-foreground ring-1 ring-destructive/20 border-transparent';
      case 'completed':
        return 'bg-primary/10 text-accent-foreground ring-1 ring-primary/20 border-transparent';
      case 'no-show':
        return 'bg-muted text-muted-foreground ring-1 ring-white/[0.08] border-transparent';
      default:
        return 'bg-muted text-muted-foreground ring-1 ring-white/[0.08] border-transparent';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return t('calPage.bookingDetail.status.confirmed', 'Confirmed');
      case 'pending':
        return t('calPage.bookingDetail.status.pending', 'Pending');
      case 'cancelled':
        return t('calPage.bookingDetail.status.cancelled', 'Cancelled');
      case 'completed':
        return t('calPage.bookingDetail.status.completed', 'Completed');
      case 'no-show':
        return t('calPage.bookingDetail.status.noShow', 'No Show');
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-xl font-semibold flex items-center gap-2 sm:gap-3">
            <div
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
              style={{ backgroundColor: resolveBookingColor(booking.service_types?.color) }}
            />
            {t('calPage.bookingDetail.title', 'Appointment Details')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-6">
          {/* Service Information */}
          <div className="bg-card rounded-lg p-2 sm:p-4 border">
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
                <div className="text-primary font-semibold text-xs sm:text-sm tabular-nums">
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
                <span className="font-medium text-xs sm:text-sm">{t('calPage.bookingDetail.calendarSection.label', 'Calendar')}</span>
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
                <span className="font-medium text-xs sm:text-sm">{t('calPage.bookingDetail.dateTimeSection.label', 'Date & Time')}</span>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <div className="font-semibold text-foreground text-xs sm:text-sm tabular-nums">
                  {format(startTime, 'EEEE d MMMM yyyy', { locale: enUS })}
                </div>
                <div className="text-muted-foreground text-xs sm:text-sm tabular-nums">
                  {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                </div>
              </div>
            </div>

            <div className="bg-card/50 rounded-lg p-2 sm:p-4 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1 sm:mb-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-medium text-xs sm:text-sm">{t('calPage.bookingDetail.durationSection.label', 'Duration')}</span>
              </div>
              <div className="font-semibold text-foreground text-xs sm:text-sm tabular-nums">
                {t('calPage.bookingDetail.duration.value', '{{duration}} minutes', { duration })}
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-card/50 rounded-lg p-2 sm:p-4 border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2 sm:mb-3">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-medium text-xs sm:text-sm">{t('calPage.bookingDetail.customerSection.label', 'Customer Information')}</span>
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
                    <span className="tabular-nums">{booking.customer_phone}</span>
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
                <span className="font-medium text-xs sm:text-sm">{t('calPage.bookingDetail.notesSection.label', 'Notes')}</span>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {booking.notes && (
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                      {t('calPage.bookingDetail.notes.customer', 'Customer notes:')}
                    </div>
                    <div className="text-xs sm:text-sm text-foreground bg-background/50 rounded p-2">
                      {booking.notes}
                    </div>
                  </div>
                )}
                {booking.internal_notes && (
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                      {t('calPage.bookingDetail.notes.internal', 'Internal notes:')}
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
