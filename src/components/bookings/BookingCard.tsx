
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
      'no-show': { label: 'No Show', variant: 'destructive' as const, color: 'bg-gray-500' }
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
      className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
      onClick={() => onBookingClick(booking)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-green-400" />
            <div>
              <CardTitle className="text-white text-lg">
                {format(new Date(booking.start_time), 'EEEE d MMMM yyyy', { locale: enUS })}
              </CardTitle>
              <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
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
            <div className="flex items-center gap-2 text-white">
              <User className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{booking.customer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{booking.customer_email}</span>
            </div>
            {booking.customer_phone && (
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{booking.customer_phone}</span>
              </div>
            )}
          </div>

          {/* Service & Notes */}
          <div className="space-y-2">
            {booking.service_name && (
              <div className="text-sm">
                <span className="text-gray-400">Service: </span>
                <span className="text-white font-medium">{booking.service_name}</span>
              </div>
            )}
            {booking.notes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="text-gray-400">Notes: </span>
                  <span className="text-gray-300">{booking.notes}</span>
                </div>
              </div>
            )}
            {booking.total_price && (
              <div className="text-sm">
                <span className="text-gray-400">Price: </span>
                <span className="text-green-400 font-medium">€{booking.total_price}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
