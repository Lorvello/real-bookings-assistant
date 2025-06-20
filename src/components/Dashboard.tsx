
import React, { useState, useEffect } from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAuth } from '@/hooks/useAuth';
import { CalendarView } from './CalendarView';
import { AvailabilityPanel } from './AvailabilityPanel';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeCalendar } from '@/hooks/useRealtimeCalendar';
import { Calendar, MessageCircle, Users, AlertTriangle } from 'lucide-react';

interface BookingStats {
  todayBookings: number;
  weekBookings: number;
  whatsappBookings: number;
  noShows: number;
}

export function Dashboard() {
  const { selectedCalendar, calendars, loading: calendarsLoading } = useCalendarContext();
  const { user } = useAuth();
  const [showAvailabilityPanel, setShowAvailabilityPanel] = useState(true);
  const [stats, setStats] = useState<BookingStats>({
    todayBookings: 0,
    weekBookings: 0,
    whatsappBookings: 0,
    noShows: 0
  });
  
  // Use real-time calendar hook for live updates
  const { bookings, isLoading: bookingsLoading } = useRealtimeCalendar(selectedCalendar?.id || '');
  const { toast } = useToast();

  // Calculate stats from real-time bookings data
  useEffect(() => {
    if (bookings.length > 0) {
      calculateStats(bookings);
    }
  }, [bookings]);

  const calculateStats = (bookingsData: any[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayBookings = bookingsData.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      return bookingDate >= today && bookingDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }).length;

    const weekBookings = bookingsData.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      return bookingDate >= startOfWeek;
    }).length;

    // Mock WhatsApp bookings count (would be determined by booking source in real app)
    const whatsappBookings = Math.floor(todayBookings * 0.6); // Simulate 60% via WhatsApp

    const noShows = bookingsData.filter(booking => 
      booking.status === 'no-show' && 
      new Date(booking.start_time) >= thirtyDaysAgo
    ).length;

    setStats({
      todayBookings,
      weekBookings,
      whatsappBookings,
      noShows
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Niet ingelogd</h2>
          <p className="text-muted-foreground">Log in om je dashboard te bekijken.</p>
        </div>
      </div>
    );
  }

  if (calendarsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!selectedCalendar) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Geen kalender gevonden</h2>
          <p className="text-muted-foreground">Maak eerst een kalender aan om je dashboard te gebruiken.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-8xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-card rounded-xl p-6 mb-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Beheer je WhatsApp Booking Assistant</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* WhatsApp Status */}
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-medium">WhatsApp Actief</span>
              </div>
              
              {/* Real-time indicator */}
              {bookingsLoading && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-600 text-sm">Live updates</span>
                </div>
              )}
              
              {/* Toggle Availability Panel */}
              <button
                onClick={() => setShowAvailabilityPanel(!showAvailabilityPanel)}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
              >
                {showAvailabilityPanel ? 'Verberg' : 'Toon'} Beschikbaarheid
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <div className={showAvailabilityPanel ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <CalendarView calendarId={selectedCalendar.id} />
          </div>

          {/* Availability Panel */}
          {showAvailabilityPanel && (
            <div className="lg:col-span-1">
              <AvailabilityPanel calendarId={selectedCalendar.id} />
            </div>
          )}
        </div>

        {/* Quick Stats - Now using real-time data */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <QuickStat
            title="Vandaag"
            value={stats.todayBookings.toString()}
            icon={<Calendar className="h-6 w-6" />}
            color="green"
          />
          <QuickStat
            title="Deze Week"
            value={stats.weekBookings.toString()}
            icon={<Users className="h-6 w-6" />}
            color="blue"
          />
          <QuickStat
            title="Via WhatsApp"
            value={stats.whatsappBookings.toString()}
            icon={<MessageCircle className="h-6 w-6" />}
            color="green"
          />
          <QuickStat
            title="No-shows"
            value={stats.noShows.toString()}
            icon={<AlertTriangle className="h-6 w-6" />}
            color="red"
          />
        </div>
      </div>
    </div>
  );
}

interface QuickStatProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'red';
}

function QuickStat({ title, value, icon, color }: QuickStatProps) {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600'
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
