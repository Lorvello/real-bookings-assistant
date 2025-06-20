
import React, { useState, useEffect } from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CalendarView } from './CalendarView';
import { AvailabilityPanel } from './AvailabilityPanel';
import { useToast } from '@/hooks/use-toast';
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
  const [loadingStats, setLoadingStats] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedCalendar?.id) {
      fetchBookingStats(selectedCalendar.id);
    }
  }, [selectedCalendar]);

  const fetchBookingStats = async (calendarId: string) => {
    setLoadingStats(true);
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

      // Fetch today's bookings
      const { data: todayData } = await supabase
        .from('bookings')
        .select('id')
        .eq('calendar_id', calendarId)
        .gte('start_time', startOfToday.toISOString())
        .lt('start_time', new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000).toISOString())
        .neq('status', 'cancelled');

      // Fetch this week's bookings
      const { data: weekData } = await supabase
        .from('bookings')
        .select('id')
        .eq('calendar_id', calendarId)
        .gte('start_time', startOfWeek.toISOString())
        .neq('status', 'cancelled');

      // Fetch WhatsApp bookings (last 30 days)
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const { data: whatsappData } = await supabase
        .from('bookings')
        .select('id, notes')
        .eq('calendar_id', calendarId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .neq('status', 'cancelled');

      // Fetch no-shows (last 30 days)
      const { data: noShowData } = await supabase
        .from('bookings')
        .select('id')
        .eq('calendar_id', calendarId)
        .eq('status', 'no-show')
        .gte('start_time', thirtyDaysAgo.toISOString());

      // Count WhatsApp bookings (those with WhatsApp-related notes or source)
      const whatsappBookings = whatsappData?.filter(booking => 
        booking.notes?.toLowerCase().includes('whatsapp') || 
        booking.notes?.toLowerCase().includes('wa') ||
        booking.notes?.toLowerCase().includes('chat')
      ).length || 0;

      setStats({
        todayBookings: todayData?.length || 0,
        weekBookings: weekData?.length || 0,
        whatsappBookings,
        noShows: noShowData?.length || 0
      });
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      toast({
        title: "Fout bij laden statistieken",
        description: "Kon de dashboard statistieken niet laden.",
        variant: "destructive",
      });
    } finally {
      setLoadingStats(false);
    }
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <QuickStat
            title="Vandaag"
            value={loadingStats ? '...' : stats.todayBookings.toString()}
            icon={<Calendar className="h-6 w-6" />}
            color="green"
          />
          <QuickStat
            title="Deze Week"
            value={loadingStats ? '...' : stats.weekBookings.toString()}
            icon={<Users className="h-6 w-6" />}
            color="blue"
          />
          <QuickStat
            title="Via WhatsApp"
            value={loadingStats ? '...' : stats.whatsappBookings.toString()}
            icon={<MessageCircle className="h-6 w-6" />}
            color="green"
          />
          <QuickStat
            title="No-shows"
            value={loadingStats ? '...' : stats.noShows.toString()}
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
