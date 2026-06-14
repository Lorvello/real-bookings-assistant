
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Phone, Mail, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface BookingCardProps {
  booking: any;
  onBookingClick: (booking: any) => void;
}

export function BookingCard({ booking, onBookingClick }: BookingCardProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: 'Confirmed', variant: 'default' as const, color: 'bg-green-500' },
      pending: { label: 'Pending', variant: 'secondary' as const, color: 'bg-yellow-500' },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const, color: 'bg-red-500' },
      completed: { label: 'Completed', variant: 'outline' as const, color: 'bg-blue-500' },
      'no-show': { label: 'No Show', variant: 'destructive' as const, color: 'bg-muted' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card 
      key={booking.id} 
      className="bg-card border-white/[0.08] cursor-pointer hover:bg-white/[0.06] transition-colors"
      onClick={() => onBookingClick(booking)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-green-400" />
            <div>
              <CardTitle className="text-foreground text-lg">
                {format(new Date(booking.start_time), 'EEEE d MMMM yyyy', { locale: enUS })}
              </CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
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
          {/* Customer Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground">
              <User className="w-4 h-4 text-muted-foreground" />
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
                <span className="text-green-400 font-medium">€{booking.total_price}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
