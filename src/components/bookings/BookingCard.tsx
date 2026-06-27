
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Phone, Mail, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface BookingCardProps {
  booking: any;
  onBookingClick: (booking: any) => void;
}

const initials = (name: string) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

export function BookingCard({ booking, onBookingClick }: BookingCardProps) {
  const { t } = useTranslation('appPages');
  const getStatusBadge = (status: string) => {
    // PLAYBOOK §6 booking status, tinted-on-tinted: confirmed = emerald (the one place
    // green is used, freed by the blue accent), pending = amber, cancelled/no-show =
    // neutral, completed = a subtle accent tint. A dot in the matching tone.
    const statusConfig: Record<string, { label: string; cls: string }> = {
      confirmed: { label: t('bookPage.statusConfirmed', 'Confirmed'), cls: 'bg-success/10 text-success-foreground ring-success/20' },
      pending: { label: t('bookPage.statusPending', 'Pending'), cls: 'bg-warning/10 text-warning-foreground ring-warning/20' },
      cancelled: { label: t('bookPage.statusCancelled', 'Cancelled'), cls: 'bg-muted text-muted-foreground ring-white/[0.08]' },
      // completed = a settled/past state → calm muted (the vivid green is reserved for
      // upcoming "Confirmed" so a glance separates live bookings from done ones).
      completed: { label: t('bookPage.statusCompleted', 'Completed'), cls: 'bg-muted text-subtle-foreground ring-white/[0.08]' },
      'no-show': { label: t('bookPage.statusNoShow', 'No Show'), cls: 'bg-muted text-muted-foreground ring-white/[0.08]' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${config.cls}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
        {config.label}
      </span>
    );
  };

  return (
    <Card
      key={booking.id}
      role="button"
      tabIndex={0}
      onClick={() => onBookingClick(booking)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onBookingClick(booking);
        }
      }}
      className="surface-raised cursor-pointer transition-transform duration-150 active:scale-[0.985] motion-reduce:active:scale-100 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <CardHeader className="pb-3">
        {/* Mobile: stack the status badge ABOVE the date as its own row (flex-col-reverse
            puts the DOM-last badge on top) so the date title gets the full width and no
            longer wraps into / collides with the badge. Desktop (sm+): the original
            title-left / badge-right row. */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Calendar aria-hidden="true" className="w-5 h-5 text-subtle-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <CardTitle className="text-foreground text-lg">
                {format(new Date(booking.start_time), 'EEEE d MMMM yyyy', { locale: enUS })}
              </CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1 tabular-nums whitespace-nowrap">
                <Clock aria-hidden="true" className="w-4 h-4 shrink-0" />
                {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
              </div>
            </div>
          </div>
          <span className="shrink-0 self-start">{getStatusBadge(booking.status)}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Customer Info — an initial-avatar leads the row (MEGA_PLAN §2.B) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-foreground">
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-accent-foreground ring-1 ring-primary/20"
              >
                {initials(booking.customer_name)}
              </span>
              <span className="font-medium">{booking.customer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground text-sm min-w-0">
              <Mail aria-hidden="true" className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{booking.customer_email}</span>
            </div>
            {booking.customer_phone && (
              <div className="flex items-center gap-2 text-foreground text-sm min-w-0">
                <Phone aria-hidden="true" className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate tabular-nums">{booking.customer_phone}</span>
              </div>
            )}
          </div>

          {/* Service & Notes */}
          <div className="space-y-2">
            {booking.service_name && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t('bookPage.cardServiceLabel', 'Service: ')}</span>
                <span className="text-foreground font-medium">{booking.service_name}</span>
              </div>
            )}
            {booking.notes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText aria-hidden="true" className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-muted-foreground">{t('bookPage.cardNotesLabel', 'Notes: ')}</span>
                  <span className="text-foreground">{booking.notes}</span>
                </div>
              </div>
            )}
            {booking.total_price && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t('bookPage.cardPriceLabel', 'Price: ')}</span>
                <span className="text-foreground font-medium tabular-nums">€{booking.total_price}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
