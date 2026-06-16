
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { useTodaysBookings } from '@/hooks/useTodaysBookings';
import { useConversationCalendar } from '@/contexts/ConversationCalendarContext';

export const TodaysScheduleCard = () => {
  const navigate = useNavigate();
  const { selectedCalendarId } = useConversationCalendar();
  const { data: bookings = [], isLoading } = useTodaysBookings(selectedCalendarId || undefined);

  const handleScheduleClick = () => {
    navigate('/calendar?view=week');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-accent-foreground" />
            Vandaag's Planning
            <div className="ml-auto h-4 w-16 bg-muted rounded animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer transition-shadow group" onClick={handleScheduleClick}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-accent-foreground" />
          Vandaag's Planning
          <Badge variant="outline" className="ml-auto">
            {bookings.length} appointments
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground group-hover:translate-x-1 transition-all duration-200" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium mb-2">No appointments today</p>
            <p className="text-sm">Your schedule is clear for today</p>
            <p className="text-xs text-accent-foreground mt-2">Click to view calendar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <div>
                    <p className="font-medium text-foreground">{booking.customer_name}</p>
                    <p className="text-sm text-muted-foreground">{booking.service_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(booking.start_time).toLocaleTimeString('nl-NL', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <Badge 
                    variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                    className="text-xs mt-1"
                  >
                    {booking.status}
                  </Badge>
                </div>
              </div>
            ))}
            <div className="text-center pt-4 border-t border-muted">
              <p className="text-xs text-accent-foreground">Click to view full calendar</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
