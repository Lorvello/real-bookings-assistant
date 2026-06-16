
import React from 'react';
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
  const getStatusBadge = (status: string) => {
    // PLAYBOOK §6 booking status, tinted-on-tinted: confirmed = emerald (the one place
    // green is used, freed by the blue accent), pending = amber, cancelled/no-show =
    // neutral, completed = a subtle accent tint. A dot in the matching tone.
    const statusConfig: Record<string, { label: string; cls: string }> = {
      confirmed: { label: 'Confirmed', cls: 'bg-success/10 text-success-foreground ring-success/20' },
      pending: { label: 'Pending', cls: 'bg-gold/10 text-gold-foreground ring-gold/20' },
      cancelled: { label: 'Cancelled', cls: 'bg-muted text-muted-foreground ring-white/[0.08]' },
      completed: { label: 'Completed', cls: 'bg-primary/10 text-accent-foreground ring-primary/20' },
      'no-show': { label: 'No Show', cls: 'bg-muted text-muted-foreground ring-white/[0.08]' }
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
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-subtle-foreground" />
            <div>
              <CardTitle className="text-foreground text-lg">
                {format(new Date(booking.start_time), 'EEEE d MMMM yyyy', { locale: enUS })}
              </CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1 tabular-nums">
                <Clock className="w-4 h-4" />
                {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
              </div>
            </div>
          </div>
          {getStatusBadge(booking.status)}
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
            <div className="flex items-center gap-2 text-foreground text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{booking.customer_email}</span>
            </div>
            {booking.customer_phone && (
              <div className="flex items-center gap-2 text-foreground text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{booking.customer_phone}</span>
              </div>
            )}
          </div>

          {/* Service & Notes */}
          <div className="space-y-2">
            {booking.service_name && (
              <div className="text-sm">
                <span className="text-muted-foreground">Service: </span>
                <span className="text-foreground font-medium">{booking.service_name}</span>
              </div>
            )}
            {booking.notes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Notes: </span>
                  <span className="text-foreground">{booking.notes}</span>
                </div>
              </div>
            )}
            {booking.total_price && (
              <div className="text-sm">
                <span className="text-muted-foreground">Price: </span>
                <span className="text-foreground font-medium tabular-nums">€{booking.total_price}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
