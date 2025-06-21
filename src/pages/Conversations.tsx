
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
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Loading...</div>
          </div>
        </div>
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
        <div className="p-8 bg-gray-900 min-h-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">WhatsApp Conversations</h1>
            <p className="text-gray-400 mt-2">Selecteer een kalender om uw conversaties te bekijken</p>
          </div>
          
          {calendars.length > 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <CardTitle className="text-gray-300">Selecteer een kalender</CardTitle>
                <CardDescription className="text-gray-400">
                  Kies een kalender om uw WhatsApp conversaties te bekijken
                </CardDescription>
                <div className="mt-6">
                  <Select onValueChange={setSelectedCalendarId}>
                    <SelectTrigger className="w-64 mx-auto bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Selecteer kalender" />
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
                <CardTitle className="text-gray-300">Geen kalenders gevonden</CardTitle>
                <CardDescription className="text-gray-400">
                  U heeft nog geen kalenders aangemaakt.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Show WhatsApp dashboard if calendar is selected
  return (
    <DashboardLayout>
      <div className="p-8 bg-gray-900 min-h-full">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">WhatsApp Conversations</h1>
            <p className="text-gray-400 mt-2">Beheer uw WhatsApp conversaties en berichten</p>
          </div>
          
          {/* Calendar Selector */}
          <div className="flex items-center gap-4">
            <label className="text-gray-300 text-sm">Kalender:</label>
            <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
              <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue />
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
        </div>

        {/* Analytics Dashboard */}
        <div className="mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Conversation Analytics
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="day">Vandaag</SelectItem>
                      <SelectItem value="week">Deze week</SelectItem>
                      <SelectItem value="month">Deze maand</SelectItem>
                      <SelectItem value="custom">Aangepast</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {timeFilter === 'custom' && (
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-48 justify-start text-left font-normal bg-gray-700 border-gray-600 text-white hover:bg-gray-600",
                            !customDate && "text-gray-400"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDate ? format(customDate, "PPP", { locale: nl }) : "Selecteer datum"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-600" align="start">
                        <Calendar
                          mode="single"
                          selected={customDate}
                          onSelect={(date) => {
                            setCustomDate(date);
                            setIsCalendarOpen(false);
                          }}
                          initialFocus
                          className="bg-gray-800 text-white"
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-gray-700 p-4 rounded-lg animate-pulse">
                      <div className="h-4 bg-gray-600 rounded mb-2"></div>
                      <div className="h-8 bg-gray-600 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Totaal Gesprekken</p>
                        <p className="text-2xl font-bold text-white">{metrics?.totalConversations || 0}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Gemiddelde Reacties</p>
                        <p className="text-2xl font-bold text-white">{metrics?.avgResponses || 0}</p>
                      </div>
                      <Clock className="h-8 w-8 text-green-400" />
                    </div>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Actieve Gesprekken</p>
                        <p className="text-2xl font-bold text-white">{metrics?.activeConversations || 0}</p>
                      </div>
                      <UserIcon className="h-8 w-8 text-yellow-400" />
                    </div>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Totaal Berichten</p>
                        <p className="text-2xl font-bold text-white">{metrics?.totalMessages || 0}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-purple-400" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* WhatsApp Interface */}
        <WhatsAppDashboard calendarId={selectedCalendarId} />
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
