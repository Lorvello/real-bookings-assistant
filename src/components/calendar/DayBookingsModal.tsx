
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Clock, User, Phone, Mail, X, ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { bookingDotStyle } from './utils/bookingColor';


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

interface DayBookingsModalProps {
  open: boolean;
  onClose: () => void;
  date: Date | null;
  bookings: Booking[];
  position?: { x: number; y: number };
  viewingAllCalendars?: boolean;
}

export function DayBookingsModal({ open, onClose, date, bookings, position, viewingAllCalendars = false }: DayBookingsModalProps) {
  const { t } = useTranslation('common');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  // Auto-show detail view for single bookings
  useEffect(() => {
    if (bookings.length === 1) {
      setSelectedBooking(bookings[0]);
      setShowDetail(true);
    } else {
      setSelectedBooking(null);
      setShowDetail(false);
    }
  }, [bookings]);

  // a11y: non-modal popover — close on Escape, move focus into the popup on
  // open, restore focus to the triggering cell on close.
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    popupRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!date || !open) return null;

  // Clamp the anchor inside the viewport and flip above/below so the popup
  // never clips off-screen (the old absolute + raw rect.top placement broke on
  // mobile and near the viewport edges).
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const anchorX = position?.x ?? vw / 2;
  const anchorY = position?.y ?? 200;
  const clampedX = Math.min(Math.max(anchorX, 110), vw - 110);
  const placeBelow = anchorY < 260;

  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetail(true);
  };

  const handleBackToList = () => {
    setShowDetail(false);
    setSelectedBooking(null);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'text-success-foreground';
      case 'pending':
        return 'text-warning-foreground';
      case 'cancelled':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return t('dayModal.statusConfirmed', 'Confirmed');
      case 'pending':
        return t('dayModal.statusPending', 'Pending');
      case 'cancelled':
        return t('dayModal.statusCancelled', 'Cancelled');
      default:
        return t('dayModal.statusUnknown', 'Unknown');
    }
  };

  const modalContent = (
    <div
      ref={popupRef}
      data-popup="true"
      role="dialog"
      aria-label={t('dayModal.ariaAppointmentsOn', 'Appointments on {{date}}', { date: format(date, 'EEEE d MMMM', { locale: enUS }) })}
      tabIndex={-1}
      className="glass fixed z-[9999] min-w-[180px] max-w-[200px] rounded-lg shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] outline-none pointer-events-auto sm:min-w-[280px] sm:max-w-[320px]"
      style={{
        left: `${clampedX}px`,
        top: `${anchorY}px`,
        transform: placeBelow ? 'translateX(-50%) translateY(12px)' : 'translateX(-50%) translateY(calc(-100% - 8px))',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {!showDetail ? (
        <>
          {/* Header */}
          <div className="p-2 sm:p-3 border-b border-white/[0.08]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground tabular-nums">
                {format(date, 'EEE d MMM', { locale: enUS })}
              </h3>
              <button
                onClick={onClose}
                aria-label={t('dayModal.close', 'Close')}
                className="p-1 hover:bg-white/[0.06] rounded-sm transition-colors"
              >
                <X aria-hidden="true" className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-2 sm:p-3 max-h-48 sm:max-h-64 overflow-y-auto">
            {sortedBookings.length === 0 ? (
              <div className="text-center py-3 sm:py-4 text-muted-foreground text-xs">
                {t('dayModal.noAppointments', 'No appointments')}
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {sortedBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-1.5 sm:p-2 rounded-md border border-white/[0.08] bg-card/30 hover:bg-white/[0.06] transition-colors cursor-pointer"
                    onClick={() => handleBookingClick(booking)}
                  >
                    <div className="flex items-start gap-1.5 sm:gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                        style={bookingDotStyle(booking.service_types?.color)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] sm:text-xs font-medium text-foreground truncate">
                          {booking.service_types?.name || booking.service_name || t('dayModal.appointmentFallback', 'Appointment')}
                        </div>
                        {viewingAllCalendars && booking.calendar && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <div
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: booking.calendar.color }}
                            />
                            <span className="text-[9px] sm:text-xs text-muted-foreground truncate">
                              {booking.calendar.name}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                          <span className="text-[9px] sm:text-xs text-foreground tabular-nums">
                            {format(new Date(booking.start_time), 'HH:mm')} -
                            {format(new Date(booking.end_time), 'HH:mm')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                          <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                          <span className="text-[9px] sm:text-xs text-foreground truncate">
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
        </>
      ) : (
        selectedBooking && (
          <>
            {/* Detail Header */}
            <div className="p-2 sm:p-3 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={handleBackToList}
                    aria-label={t('dayModal.backToList', 'Back to list')}
                    className="p-1 hover:bg-white/[0.06] rounded-sm transition-colors"
                  >
                    <ArrowLeft aria-hidden="true" className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                    {t('dayModal.bookingDetails', 'Booking Details')}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  aria-label={t('dayModal.close', 'Close')}
                  className="p-1 hover:bg-white/[0.06] rounded-sm transition-colors"
                >
                  <X aria-hidden="true" className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Detail Content */}
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-64 sm:max-h-80 overflow-y-auto">
              {/* Service Information */}
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                    style={bookingDotStyle(selectedBooking.service_types?.color)}
                  />
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-foreground">
                      {selectedBooking.service_types?.name || selectedBooking.service_name || t('dayModal.appointmentFallback', 'Appointment')}
                    </h4>
                    {selectedBooking.service_types?.description && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {selectedBooking.service_types.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Calendar Information - only show when viewing all calendars */}
              {viewingAllCalendars && selectedBooking.calendar && (
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                      style={{ backgroundColor: selectedBooking.calendar.color }}
                    />
                    <div>
                      <div className="text-xs sm:text-sm text-foreground">
                        {t('dayModal.calendarLabel', 'Calendar:')} {selectedBooking.calendar.name}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Time Information */}
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs sm:text-sm text-foreground tabular-nums">
                      {format(new Date(selectedBooking.start_time), 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="text-xs sm:text-sm text-foreground tabular-nums">
                      {format(new Date(selectedBooking.start_time), 'h:mm a')} - {format(new Date(selectedBooking.end_time), 'h:mm a')}
                    </div>
                    {selectedBooking.service_types?.duration && (
                      <div className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
                        {t('dayModal.duration', 'Duration: {{minutes}} minutes', { minutes: selectedBooking.service_types.duration })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-foreground">
                      {selectedBooking.customer_name}
                    </div>
                    {selectedBooking.customer_email && (
                      <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                        <Mail className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                        <span className="text-[10px] sm:text-xs text-foreground">
                          {selectedBooking.customer_email}
                        </span>
                      </div>
                    )}
                    {selectedBooking.customer_phone && (
                      <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                        <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                        <span className="text-[10px] sm:text-xs text-foreground tabular-nums">
                          {selectedBooking.customer_phone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">{t('dayModal.status', 'Status')}</span>
                <span className={`text-xs sm:text-sm font-medium ${getStatusColor(selectedBooking.status)}`}>
                  {getStatusLabel(selectedBooking.status)}
                </span>
              </div>

              {/* Price */}
              {selectedBooking.total_price && (
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">{t('dayModal.price', 'Price')}</span>
                  <span className="text-xs sm:text-sm font-medium text-foreground tabular-nums">
                    €{selectedBooking.total_price}
                  </span>
                </div>
              )}

              {/* Notes */}
              {selectedBooking.notes && (
                <div className="space-y-1">
                  <h5 className="text-xs sm:text-sm font-medium text-foreground">{t('dayModal.notes', 'Notes')}</h5>
                  <p className="text-[10px] sm:text-xs text-foreground bg-card/50 p-1.5 sm:p-2 rounded">
                    {selectedBooking.notes}
                  </p>
                </div>
              )}

              {/* Internal Notes */}
              {selectedBooking.internal_notes && (
                <div className="space-y-1">
                  <h5 className="text-xs sm:text-sm font-medium text-foreground">{t('dayModal.internalNotes', 'Internal Notes')}</h5>
                  <p className="text-[10px] sm:text-xs text-foreground bg-card/50 p-1.5 sm:p-2 rounded">
                    {selectedBooking.internal_notes}
                  </p>
                </div>
              )}
            </div>
          </>
        )
      )}
    </div>
  );

  return (
    <>
      {/* Dismiss backdrop — outside-click / tap closes the popup */}
      <div className="fixed inset-0 z-[9998]" onClick={onClose} aria-hidden="true" />
      {modalContent}
    </>
  );
}
