
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageSquare, Clock, User as UserIcon, CalendarIcon, TrendingUp, AlertCircle } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ConversationCalendarProvider, useConversationCalendar } from '@/contexts/ConversationCalendarContext';
import { useWhatsAppConversationMetrics } from '@/hooks/useWhatsAppConversationMetrics';
import { useWhatsAppConversationsList } from '@/hooks/useWhatsAppConversationsList';
import { WhatsAppDashboard } from '@/components/whatsapp/WhatsAppDashboard';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { ConversationsSkeleton } from '@/components/loading/ConversationsSkeleton';

const ConversationsContent = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCalendarId, calendars, setSelectedCalendarId } = useConversationCalendar();
  
  const [timeFilter, setTimeFilter] = useState('week');
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed' | 'archived'>('all');

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = new Date();
    switch (timeFilter) {
      case 'day':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'month':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case 'custom':
        if (customDate) {
          return { start: startOfDay(customDate), end: endOfDay(customDate) };
        }
        return { start: startOfDay(now), end: endOfDay(now) };
      default:
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    }
  };

  const dateRange = getDateRange();
  
  // Use real data hooks
  const { data: metrics, isLoading: metricsLoading } = useWhatsAppConversationMetrics(selectedCalendarId || undefined);
  const { conversations, isLoading: conversationsLoading } = useWhatsAppConversationsList(
    selectedCalendarId || '',
    {
      searchTerm,
      statusFilter,
      dateRange,
    }
  );

  if (authLoading) {
    return (
      <DashboardLayout>
        <ConversationsSkeleton />
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  // Show no calendar selected state
  if (!selectedCalendarId) {
    return (
      <DashboardLayout>
        <div className="bg-gray-900 min-h-full p-2 md:p-8">
          <div className="space-y-3 md:space-y-6">
            <SimplePageHeader title="WhatsApp" />
            
            {calendars.length > 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <CardTitle className="text-gray-300">Select a calendar</CardTitle>
                  <CardDescription className="text-gray-400">
                    Choose a calendar to view your WhatsApp conversations
                  </CardDescription>
                  <div className="mt-6">
                    <Select onValueChange={setSelectedCalendarId}>
                      <SelectTrigger className="w-64 mx-auto bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select calendar" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {calendars.map((calendar) => (
                          <SelectItem key={calendar.id} value={calendar.id}>
                            {calendar.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
              </Card>
            ) : (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <CardTitle className="text-gray-300">No calendars found</CardTitle>
                  <CardDescription className="text-gray-400">
                    You haven't created any calendars yet.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show WhatsApp dashboard if calendar is selected
  return (
    <DashboardLayout>
      <div className="bg-gray-900 h-full flex flex-col p-3 md:p-8">
        {/* Header - fixed height */}
        <div className="shrink-0 mb-4 md:mb-6">
          <SimplePageHeader title="WhatsApp" />
        </div>

        {/* Dashboard - takes remaining space */}
        <div className="flex-1 min-h-0 bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl overflow-hidden">
          <WhatsAppDashboard calendarId={selectedCalendarId} />
        </div>
      </div>
    </DashboardLayout>
  );
};

const Conversations = () => {
  return (
    <ConversationCalendarProvider>
      <ConversationsContent />
    </ConversationCalendarProvider>
  );
};

export default Conversations;
