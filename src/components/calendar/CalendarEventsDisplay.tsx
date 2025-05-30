
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_busy: boolean;
  last_synced_at: string;
}

interface CalendarEventsDisplayProps {
  user: User | null;
  syncing?: boolean;
}

export const CalendarEventsDisplay: React.FC<CalendarEventsDisplayProps> = ({ 
  user, 
  syncing = false 
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, start_time, end_time, is_busy, last_synced_at')
        .eq('user_id', user.id)
        .eq('is_busy', true)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) {
        console.error('[CalendarEvents] Error fetching events:', error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('[CalendarEvents] Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  // Refetch events when syncing completes
  useEffect(() => {
    if (!syncing) {
      fetchEvents();
    }
  }, [syncing]);

  const formatEventTime = (startTime: string, endTime: string) => {
    try {
      const start = parseISO(startTime);
      const end = parseISO(endTime);
      
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');
      
      if (startDate === endDate) {
        // Same day
        if (isToday(start)) {
          return `Vandaag ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
        } else if (isTomorrow(start)) {
          return `Morgen ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
        } else {
          return `${format(start, 'dd MMM HH:mm', { locale: nl })} - ${format(end, 'HH:mm')}`;
        }
      } else {
        // Multi-day event
        return `${format(start, 'dd MMM HH:mm', { locale: nl })} - ${format(end, 'dd MMM HH:mm', { locale: nl })}`;
      }
    } catch (error) {
      console.error('[CalendarEvents] Error formatting time:', error);
      return 'Tijd onbekend';
    }
  };

  if (loading || syncing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-green-600" />
            Komende Agenda Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            <span className="ml-2 text-gray-600">
              {syncing ? 'Synchroniseren...' : 'Laden...'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-green-600" />
          Komende Agenda Events
          <Badge variant="outline" className="ml-auto">
            {events.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Geen komende events</p>
            <p className="text-sm">Je agenda is vrij voor de komende week</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div 
                key={event.id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-green-500"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    {event.title}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatEventTime(event.start_time, event.end_time)}
                  </div>
                </div>
                <Badge 
                  variant={event.is_busy ? "destructive" : "secondary"}
                  className="ml-3"
                >
                  {event.is_busy ? 'Bezet' : 'Vrij'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
