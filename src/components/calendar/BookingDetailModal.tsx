
import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { dateFnsLocale } from '@/lib/dateLocale';
import { Clock, User, Phone, Mail, Calendar, FileText, XCircle, UserX } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBookingActions } from '@/hooks/useBookingActions';
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
  /** Called after a successful owner action so the parent can refetch. */
  onActed?: () => void;
}

export function BookingDetailModal({ open, onClose, booking, viewingAllCalendars = false, onActed }: BookingDetailModalProps) {
  const { t, i18n } = useTranslation('appPages');
  const locale = dateFnsLocale(i18n.language);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const { act, pendingAction, isActing } = useBookingActions(() => {
    onActed?.();
    onClose();
  });

  if (!booking) return null;

  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

  // Owner actions only make sense on a still-active booking.
  const isTerminal = ['cancelled', 'completed', 'no-show'].includes(booking.status);
  // A booking that has not started yet cannot be a no-show (mirrors the server guard).
  const isFuture = startTime.getTime() > Date.now();
  const canMarkNoShow = !isTerminal && !isFuture;
  const canCancel = !isTerminal;
  const showActions = canCancel || canMarkNoShow;

  const handleMarkNoShow = () => {
    void act({ bookingId: booking.id, status: 'no-show' });
  };

  const handleConfirmCancel = async () => {
    const ok = await act({ bookingId: booking.id, status: 'cancelled' });
    if (ok) setCancelConfirmOpen(false);
  };

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
          {/* sr-only: satisfies Radix's Dialog description requirement (was missing,
              found via a real console warning during R20's a11y pass) without changing
              the modal's already-reviewed visual layout. */}
          <DialogDescription className="sr-only">
            {t('calPage.bookingDetail.description', 'Details and actions for this appointment.')}
          </DialogDescription>
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
                  {format(startTime, 'EEEE d MMMM yyyy', { locale })}
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
                {/* Attendee name: this product's data model has one customer_name field
                    shared between "who the appointment is for" and "who we message on
                    WhatsApp", so a small "For" caption disambiguates at a glance
                    (IUX R77, P14-DASHBOARD-NO-ATTENDEE-LABEL). */}
                <div className="text-[11px] leading-tight text-muted-foreground">
                  {t('calPage.bookingDetail.customerSection.forLabel', 'For')}
                </div>
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
                  <div className="text-[11px] leading-tight text-muted-foreground">
                    {t('calPage.bookingDetail.customerSection.contactLabel', 'Contact')}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 text-foreground text-xs sm:text-sm">
                    <Phone className="w-2 h-2 sm:w-3 sm:h-3 text-muted-foreground" />
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

        {showActions && (
          <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row sm:justify-end">
            {canMarkNoShow && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={pendingAction === 'no-show'}
                disabled={isActing}
                onClick={handleMarkNoShow}
                className="w-full sm:w-auto"
              >
                <UserX aria-hidden="true" className="h-4 w-4" />
                {t('calPage.bookingDetail.actions.markNoShow', 'Mark as no-show')}
              </Button>
            )}
            {canCancel && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                loading={pendingAction === 'cancelled'}
                disabled={isActing}
                onClick={() => setCancelConfirmOpen(true)}
                className="w-full bg-[hsl(0_72%_45%)] text-white hover:bg-[hsl(0_72%_40%)] sm:w-auto"
              >
                <XCircle aria-hidden="true" className="h-4 w-4" />
                {t('calPage.bookingDetail.actions.cancelBooking', 'Cancel booking')}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={(o) => { if (!isActing) setCancelConfirmOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('calPage.bookingDetail.actions.cancelConfirmTitle', 'Cancel this booking?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'calPage.bookingDetail.actions.cancelConfirmBody',
                'This cancels {{name}}’s appointment and frees the time slot. The customer is not notified automatically. This cannot be undone.',
                { name: booking.customer_name },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActing}>
              {t('calPage.bookingDetail.actions.cancelConfirmKeep', 'Keep booking')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleConfirmCancel(); }}
              disabled={isActing}
              className="bg-[hsl(0_72%_45%)] text-white hover:bg-[hsl(0_72%_40%)]"
            >
              {pendingAction === 'cancelled'
                ? t('calPage.bookingDetail.actions.cancelling', 'Cancelling…')
                : t('calPage.bookingDetail.actions.cancelConfirmYes', 'Yes, cancel it')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
