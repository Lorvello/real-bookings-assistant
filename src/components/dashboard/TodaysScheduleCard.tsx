
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Phone, Mail } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';
import { useAuth } from '@/hooks/useAuth';

export const TodaysScheduleCard = () => {
  const { user } = useAuth();
  const { getTodaysAppointments, loading } = useAppointments(user);

  const todaysAppointments = getTodaysAppointments();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'no_show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Bevestigd';
      case 'pending':
        return 'In afwachting';
      case 'cancelled':
        return 'Geannuleerd';
      case 'completed':
        return 'Voltooid';
      case 'no_show':
        return 'Niet verschenen';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-green-600" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading today's appointments...
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
          Today's Schedule
          <Badge variant="outline" className="ml-auto">
            {todaysAppointments.length} appointments
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todaysAppointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No appointments today</p>
            <p className="text-sm">Your schedule is free for today</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todaysAppointments
              .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
              .map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {appointment.appointment_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
                      </span>
                    </div>
                    <Badge className={getStatusColor(appointment.status)} variant="outline">
                      {getStatusLabel(appointment.status)}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{appointment.client_name}</span>
                    </div>

                    {appointment.client_email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{appointment.client_email}</span>
                      </div>
                    )}

                    {appointment.client_phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{appointment.client_phone}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          {appointment.service_name}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({appointment.service_duration} min)
                        </span>
                      </div>
                      {appointment.price && (
                        <span className="text-sm font-medium text-green-600">
                          €{appointment.price}
                        </span>
                      )}
                    </div>

                    {appointment.notes && (
                      <div className="pt-2 text-sm text-gray-600 italic">
                        "{appointment.notes}"
                      </div>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
};
