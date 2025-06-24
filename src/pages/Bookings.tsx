
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useOptimizedBookings } from '@/hooks/useOptimizedBookings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, Phone, Mail, FileText, Search, Filter } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth, startOfDay, isSameDay } from 'date-fns';
import { nl } from 'date-fns/locale';

const Bookings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCalendar, calendars, getActiveCalendarIds, loading: calendarsLoading } = useCalendarContext();
  
  // Get primary calendar for bookings
  const activeCalendarIds = getActiveCalendarIds();
  const primaryCalendarId = activeCalendarIds.length > 0 ? activeCalendarIds[0] : undefined;
  
  const { bookings, loading: bookingsLoading } = useOptimizedBookings(primaryCalendarId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Filter and sort bookings
  const filteredAndSortedBookings = useMemo(() => {
    let filtered = bookings.filter(booking => {
      // Search filter
      const matchesSearch = booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           booking.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (booking.customer_phone && booking.customer_phone.includes(searchTerm));
      
      if (!matchesSearch) return false;
      
      // Status filter
      if (filterStatus === 'today') {
        return isToday(new Date(booking.start_time));
      } else if (filterStatus === 'week') {
        return isThisWeek(new Date(booking.start_time), { locale: nl });
      } else if (filterStatus === 'month') {
        return isThisMonth(new Date(booking.start_time));
      }
      
      return true;
    });

    // Sort bookings
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || b.start_time).getTime() - new Date(a.created_at || a.start_time).getTime();
        case 'date':
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        case 'customer':
          return a.customer_name.localeCompare(b.customer_name);
        default:
          return 0;
      }
    });
  }, [bookings, searchTerm, filterStatus, sortBy]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: 'Bevestigd', variant: 'default' as const, color: 'bg-green-500' },
      pending: { label: 'Afwachting', variant: 'secondary' as const, color: 'bg-yellow-500' },
      cancelled: { label: 'Geannuleerd', variant: 'destructive' as const, color: 'bg-red-500' },
      completed: { label: 'Voltooid', variant: 'outline' as const, color: 'bg-blue-500' },
      'no-show': { label: 'Niet verschenen', variant: 'destructive' as const, color: 'bg-gray-500' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  if (authLoading || calendarsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Laden...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (calendars.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <div className="text-lg text-gray-300">Geen kalender gevonden</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Mijn Bookings</h1>
          <p className="text-gray-400 mt-1">
            Overzicht van al je afspraken
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Zoek op klant naam, email of telefoon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48 bg-gray-800 border-gray-700 text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">Alle bookings</SelectItem>
                <SelectItem value="today">Vandaag</SelectItem>
                <SelectItem value="week">Deze week</SelectItem>
                <SelectItem value="month">Komende maand</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48 bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="newest">Nieuwste eerst</SelectItem>
                <SelectItem value="date">Datum</SelectItem>
                <SelectItem value="customer">Klant naam</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
          {bookingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-gray-300">Bookings laden...</div>
              </div>
            </div>
          ) : filteredAndSortedBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                {searchTerm || filterStatus !== 'all' ? 'Geen bookings gevonden' : 'Nog geen bookings'}
              </h3>
              <p className="text-gray-500">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Probeer je zoekopdracht of filters aan te passen.'
                  : 'Je eerste booking zal hier verschijnen wanneer deze wordt gemaakt.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedBookings.map((booking) => (
                <Card key={booking.id} className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-green-400" />
                        <div>
                          <CardTitle className="text-white text-lg">
                            {format(new Date(booking.start_time), 'EEEE d MMMM yyyy', { locale: nl })}
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
                              <span className="text-gray-400">Notities: </span>
                              <span className="text-gray-300">{booking.notes}</span>
                            </div>
                          </div>
                        )}
                        {booking.total_price && (
                          <div className="text-sm">
                            <span className="text-gray-400">Prijs: </span>
                            <span className="text-green-400 font-medium">€{booking.total_price}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Bookings;
