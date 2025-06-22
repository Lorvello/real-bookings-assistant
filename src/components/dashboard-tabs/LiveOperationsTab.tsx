
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLiveOperations } from '@/hooks/dashboard/useLiveOperations';
import { Calendar, Clock, MessageCircle, Users, AlertCircle, CheckCircle } from 'lucide-react';

interface LiveOperationsTabProps {
  calendarId: string;
}

export function LiveOperationsTab({ calendarId }: LiveOperationsTabProps) {
  const { data: liveOps, isLoading } = useLiveOperations(calendarId);

  if (isLoading) {
    return <div className="animate-pulse">Loading live operations...</div>;
  }

  const nextAppointmentTime = liveOps?.next_appointment_time 
    ? new Date(liveOps.next_appointment_time)
    : null;

  const timeUntilNext = nextAppointmentTime 
    ? Math.max(0, Math.floor((nextAppointmentTime.getTime() - Date.now()) / (1000 * 60)))
    : null;

  return (
    <div className="space-y-6">
      {/* Real-time Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Vandaag</p>
                <p className="text-2xl font-bold text-green-900">{liveOps?.today_bookings || 0}</p>
                <p className="text-xs text-green-600">
                  {liveOps?.today_confirmed || 0} bevestigd, {liveOps?.today_pending || 0} wachtend
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Nu Actief</p>
                <p className="text-2xl font-bold text-blue-900">{liveOps?.currently_active_bookings || 0}</p>
                <p className="text-xs text-blue-600">lopende afspraken</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">WhatsApp</p>
                <p className="text-2xl font-bold text-purple-900">{liveOps?.whatsapp_messages_last_hour || 0}</p>
                <p className="text-xs text-purple-600">berichten laatste uur</p>
              </div>
              <MessageCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">Volgende</p>
                {timeUntilNext !== null ? (
                  <>
                    <p className="text-2xl font-bold text-orange-900">{timeUntilNext}m</p>
                    <p className="text-xs text-orange-600">tot volgende afspraak</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-orange-900">Geen</p>
                    <p className="text-xs text-orange-600">geplande afspraken</p>
                  </>
                )}
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Status Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Kalender Status</span>
              <Badge variant="outline" className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Online
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">WhatsApp Bot</span>
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Actief
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Laatste Update</span>
              <span className="text-xs text-muted-foreground">
                {liveOps?.last_updated 
                  ? new Date(liveOps.last_updated).toLocaleTimeString('nl-NL')
                  : 'Onbekend'
                }
              </span>
            </div>
            
            {liveOps?.today_pending && liveOps.today_pending > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    {liveOps.today_pending} afspraken wachten op bevestiging
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vandaag's Planning</CardTitle>
          </CardHeader>
          <CardContent>
            {nextAppointmentTime ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Volgende Afspraak</p>
                    <p className="text-sm text-muted-foreground">
                      {nextAppointmentTime.toLocaleTimeString('nl-NL', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <Badge variant={timeUntilNext && timeUntilNext < 30 ? "destructive" : "secondary"}>
                    {timeUntilNext && timeUntilNext < 60 
                      ? `${timeUntilNext} min`
                      : `${Math.floor((timeUntilNext || 0) / 60)}u ${(timeUntilNext || 0) % 60}m`
                    }
                  </Badge>
                </div>
                
                <div className="text-center text-sm text-muted-foreground">
                  Bekijk alle afspraken in de kalender voor meer details
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Geen afspraken gepland voor vandaag</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
