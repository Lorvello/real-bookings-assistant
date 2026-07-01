
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageSquare, Clock, User as UserIcon, CalendarIcon, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';
import { ConversationCalendarProvider, useConversationCalendar } from '@/contexts/ConversationCalendarContext';
import { useWhatsAppConversationMetrics } from '@/hooks/useWhatsAppConversationMetrics';
import { useWhatsAppConversationsList } from '@/hooks/useWhatsAppConversationsList';
import { WhatsAppDashboard } from '@/components/whatsapp/WhatsAppDashboard';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { ConversationsSkeleton } from '@/components/loading/ConversationsSkeleton';

const ConversationsContent = () => {
  const { t } = useTranslation('appPages');
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCalendarId, calendars, setSelectedCalendarId } = useConversationCalendar();
  
  const [timeFilter, setTimeFilter] = useState('week');
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed' | 'archived'>('all');
  const [createCalendarOpen, setCreateCalendarOpen] = useState(false);

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
  const { data: metrics, isLoading: metricsLoading, isError: metricsError, refetch: refetchMetrics } = useWhatsAppConversationMetrics(selectedCalendarId || undefined);
  const { conversations, isLoading: conversationsLoading, error: conversationsError, refetch: refetchConversations } = useWhatsAppConversationsList(
    selectedCalendarId || '',
    {
      searchTerm,
      statusFilter,
      dateRange,
    }
  );
  const hasFetchError = metricsError || !!conversationsError;

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
        <div className="bg-background min-h-full p-2 md:p-8">
          <div className="space-y-3 md:space-y-6">
            <SimplePageHeader title={t('convPage.header', 'WhatsApp')} />
            
            {calendars.length > 0 ? (
              <Card>
                <CardHeader className="text-center py-12">
                  <div className="glow-accent relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                    <CalendarIcon className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-foreground">{t('convPage.noCalendarTitle', 'Select a calendar')}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {t('convPage.noCalendarDescription', 'Choose a calendar to view your WhatsApp conversations')}
                  </CardDescription>
                  <div className="mt-6">
                    <Select onValueChange={setSelectedCalendarId}>
                      <SelectTrigger className="w-64 mx-auto bg-muted border-white/[0.08] text-foreground">
                        <SelectValue placeholder={t('convPage.selectCalendarPlaceholder', 'Select calendar')} />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-white/[0.08]">
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
              <Card>
                <CardHeader className="text-center py-12">
                  <div className="glow-accent relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                    <CalendarIcon className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-foreground">{t('convPage.noCalendarsTitle', 'Create your first calendar')}</CardTitle>
                  <CardDescription className="text-muted-foreground mx-auto max-w-sm">
                    {t('convPage.noCalendarsDescription', 'WhatsApp conversations are tied to a calendar. Create one to start receiving and managing bookings here.')}
                  </CardDescription>
                  <div className="mt-6">
                    <Button className="gap-2" onClick={() => setCreateCalendarOpen(true)}>
                      <Plus aria-hidden="true" className="h-4 w-4" />
                      {t('convPage.createCalendarButton', 'Create calendar')}
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>

        <CreateCalendarDialog
          open={createCalendarOpen}
          onOpenChange={setCreateCalendarOpen}
          trigger="button"
        />
      </DashboardLayout>
    );
  }

  // Graceful error state: if the metrics/list fetch fails (network / RLS / server),
  // show a recoverable error card instead of a blank surface or a raw error
  // (FQ-A-CONV). Mirrors the no-calendar empty-state pattern + the calendar grid's
  // retry affordance; the destructive icon + retry button keep it on-brand.
  if (hasFetchError) {
    return (
      <DashboardLayout>
        <div className="bg-background min-h-full p-2 md:p-8">
          <div className="space-y-3 md:space-y-6">
            <SimplePageHeader title={t('convPage.header', 'WhatsApp')} />
            <Card role="alert">
              <CardHeader className="text-center py-12">
                <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
                  <AlertCircle aria-hidden="true" className="h-6 w-6 text-destructive-foreground" />
                </div>
                <CardTitle className="text-foreground">{t('convPage.errorTitle', "Couldn't load your conversations")}</CardTitle>
                <CardDescription className="text-muted-foreground mx-auto max-w-sm">
                  {t('convPage.errorDescription', 'Something went wrong while loading your WhatsApp data. Please try again.')}
                </CardDescription>
                <div className="mt-6">
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => { refetchMetrics(); refetchConversations(); }}
                  >
                    {t('convPage.errorRetry', 'Try again')}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show WhatsApp dashboard if calendar is selected
  return (
    <DashboardLayout>
      <div className="bg-background h-full flex flex-col p-3 md:p-8">
        {/* Header - fixed height */}
        <div className="shrink-0 mb-4 md:mb-6">
          <SimplePageHeader title={t('convPage.header', 'WhatsApp')} />
        </div>

        {/* Dashboard - takes remaining space */}
        <div className="flex-1 min-h-0 surface-raised rounded-xl overflow-hidden">
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
