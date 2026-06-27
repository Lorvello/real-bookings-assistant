
import React from 'react';
import { format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useOptimizedLiveOperations } from '@/hooks/dashboard/useOptimizedLiveOperations';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { useRealtimeConnectionStatus } from '@/hooks/useRealtimeConnectionStatus';
import { useGlobalBotStatus } from '@/hooks/useGlobalBotStatus';
import { useMultipleCalendarRealtimeStatus } from '@/hooks/useMultipleCalendarRealtimeStatus';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useCalendars } from '@/hooks/useCalendars';
import { Calendar, Clock, MessageCircle, Users, Activity, Zap, Info, ArrowRight, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { MetricCard } from './business-intelligence/MetricCard';

interface LiveOperationsTabProps {
  calendarIds: string[];
}

export function LiveOperationsTab({ calendarIds }: LiveOperationsTabProps) {
  const { t, i18n } = useTranslation('dashboard');
  const dateLocale = i18n.language === 'nl' ? nl : enUS;
  const navigate = useNavigate();
  const { data: liveOps, isLoading, isError } = useOptimizedLiveOperations(calendarIds);
  const { userStatus, accessControl } = useUserStatus();
  const { calendars } = useCalendars();
  const { data: globalBotStatus } = useGlobalBotStatus();
  const multipleRealtimeStatus = useMultipleCalendarRealtimeStatus(calendarIds);

  // Setup realtime subscription for first calendar (for backward compatibility)
  useRealtimeSubscription(calendarIds[0]);

  // Display-only label for the status sentinel. The `status` field itself stays
  // English (it is also a logic sentinel, compared in the tooltips below), so the
  // i18n wrap is at the DISPLAY layer only (R41 decouple discipline).
  const statusLabel = (s: string): string => {
    switch (s) {
      case 'Online': return t('dashboard.liveOps.status.online', 'Online');
      case 'Offline': return t('dashboard.liveOps.status.offline', 'Offline');
      case 'Partial': return t('dashboard.liveOps.status.partial', 'Partial');
      case 'Active': return t('dashboard.liveOps.status.active', 'Active');
      case 'Paused': return t('dashboard.liveOps.status.paused', 'Paused');
      case 'Disconnected': return t('dashboard.liveOps.status.disconnected', 'Disconnected');
      case 'Live': return t('dashboard.liveOps.status.live', 'Live');
      default: return s;
    }
  };

  // Calculate system statuses
  const getCalendarStatus = () => {
    // For multiple calendars, check if ALL are online
    const relevantCalendars = calendars.filter(cal => calendarIds.includes(cal.id));
    const onlineCount = relevantCalendars.filter(cal => cal.is_active).length;
    const totalCount = relevantCalendars.length;

    if (totalCount === 0) {
      return {
        status: 'Offline',
        color: 'red',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/30',
        textColor: 'text-destructive-foreground',
        detail: t('dashboard.liveOps.sys.noCalendars', 'No calendars found')
      };
    }

    if (onlineCount === totalCount) {
      return {
        status: 'Online',
        color: 'green',
        bgColor: 'bg-success/10',
        borderColor: 'border-white/[0.12]',
        textColor: 'text-accent-foreground',
        detail: t('dashboard.liveOps.sys.calsOnline', '{{online}} of {{total}} calendars online', { online: onlineCount, total: totalCount })
      };
    }

    return {
      status: 'Partial',
      color: 'yellow',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
      textColor: 'text-warning-foreground',
      detail: t('dashboard.liveOps.sys.calsOnline', '{{online}} of {{total}} calendars online', { online: onlineCount, total: totalCount })
    };
  };

  const getBookingsAssistantStatus = () => {
    // Check if subscription allows WhatsApp access
    if (!accessControl.canAccessWhatsApp || userStatus.isExpired) {
      return {
        status: 'Offline',
        color: 'red',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/30',
        textColor: 'text-destructive-foreground',
        reason: userStatus.isExpired
          ? t('dashboard.liveOps.sys.subExpired', 'Subscription expired')
          : t('dashboard.liveOps.sys.noWhatsapp', 'No WhatsApp access'),
        clickable: false
      };
    }

    // Check if global bot is enabled
    if (!globalBotStatus?.whatsapp_bot_active) {
      return {
        status: 'Paused',
        color: 'yellow',
        bgColor: 'bg-warning/10',
        borderColor: 'border-warning/30',
        textColor: 'text-warning-foreground',
        reason: t('dashboard.liveOps.sys.botDisabled', 'Bot disabled in settings'),
        clickable: true
      };
    }

    return {
      status: 'Active',
      color: 'green',
      bgColor: 'bg-success/10',
      borderColor: 'border-white/[0.12]',
      textColor: 'text-accent-foreground',
      reason: t('dashboard.liveOps.sys.botActive', 'Bot is responding to messages globally'),
      clickable: true
    };
  };

  const getRealtimeStatus = () => {
    const { isConnected, connectionCount, totalCalendars } = multipleRealtimeStatus;

    if (!isConnected) {
      return {
        status: 'Disconnected',
        color: 'red',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/30',
        textColor: 'text-destructive-foreground',
        reason: t('dashboard.liveOps.sys.calsConnected', '{{connected}} of {{total}} calendars connected', { connected: connectionCount, total: totalCalendars }),
        detail: t('dashboard.liveOps.sys.syncDetail', 'Real-time sync keeps your bookings updated instantly across all systems')
      };
    }
    return {
      status: 'Live',
      color: 'green',
      bgColor: 'bg-success/10',
      borderColor: 'border-white/[0.12]',
      textColor: 'text-accent-foreground',
      reason: t('dashboard.liveOps.sys.allConnected', 'All {{total}} calendars connected', { total: totalCalendars }),
      detail: t('dashboard.liveOps.sys.syncDetail', 'Real-time sync keeps your bookings updated instantly across all systems')
    };
  };

  const calendarStatus = getCalendarStatus();
  const bookingsAssistantStatus = getBookingsAssistantStatus();
  const realtimeSyncStatus = getRealtimeStatus();

  const handleTodayScheduleClick = () => {
    navigate('/calendar?view=week');
  };

  const handleBookingAssistantClick = () => {
    navigate('/settings?tab=operations');
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 surface-raised shimmer rounded-2xl border border-white/[0.08]" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-8">
        <div className="surface-raised rounded-2xl border border-white/[0.08] p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-2xl flex items-center justify-center border border-destructive/20">
            <Activity className="h-8 w-8 text-destructive-foreground" />
          </div>
          <p className="text-foreground font-medium mb-1">{t('dashboard.liveOps.err.title', 'Live data unavailable')}</p>
          <p className="text-sm text-muted-foreground">{t('dashboard.liveOps.err.desc', "We couldn't load live operations right now. It refreshes automatically.")}</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 md:space-y-12">
        {/* Real-time Status Indicator - Mobile optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-8 gap-2 sm:gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-4 h-4 bg-primary rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-4 h-4 bg-success rounded-full animate-ping opacity-75"></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{t('dashboard.liveOps.header.title', 'Live Operations Center')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.liveOps.header.subtitle', 'Real-time data - updates automatically every minute')}</p>
            </div>
          </div>

          {liveOps?.last_updated && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t('dashboard.liveOps.header.lastUpdate', 'Last update')}</p>
              <p className="text-sm font-mono text-foreground">
                {new Date(liveOps.last_updated).toLocaleTimeString(i18n.language === 'nl' ? 'nl-NL' : 'en-US')}
              </p>
            </div>
          )}
        </div>

        {/* Real-time Metrics Cards - mono-accent - Mobile optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
              >
                <MetricCard
                  title={t('dashboard.liveOps.metric.todayTitle', 'Today')}
                  value={String(liveOps?.today_bookings || 0)}
                  subtitle={t('dashboard.liveOps.metric.todaySubtitle', 'confirmed appointments')}
                  icon={Calendar}
                  variant="green"
                  delay={0.1}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent
              className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50"
              side="top"
              align="center"
            >
              <p className="text-sm">
                {t('dashboard.liveOps.metric.tipToday', 'Shows total confirmed appointments scheduled for today. This includes all booked services across your calendar.')}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <MetricCard
                  title={t('dashboard.liveOps.metric.convTitle', 'Active Conversations')}
                  value={String(liveOps?.active_conversations_today || 0)}
                  subtitle={t('dashboard.liveOps.metric.convSubtitle', 'open WhatsApp chats')}
                  icon={MessageCircle}
                  variant="green"
                  delay={0.2}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent
              className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50"
              side="top"
              align="center"
            >
              <p className="text-sm">
                {t('dashboard.liveOps.metric.tipConv', 'Number of WhatsApp conversations currently marked active (open), across new inquiries and ongoing customer chats.')}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="relative"
              >
                <MetricCard
                  title={t('dashboard.liveOps.metric.apptTitle', 'Active Appointments')}
                  value={String(liveOps?.active_appointments || 0)}
                  subtitle={t('dashboard.liveOps.metric.apptSubtitle', 'currently ongoing')}
                  icon={Users}
                  variant="green"
                  delay={0.3}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent
              className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50"
              side="top"
              align="center"
            >
              <p className="text-sm">
                {t('dashboard.liveOps.metric.tipAppt', 'Number of appointments currently in progress right now. These are live sessions happening at this moment.')}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="relative cursor-pointer group"
                onClick={handleTodayScheduleClick}
              >
                <MetricCard
                  title={t('dashboard.liveOps.metric.nextTitle', 'Next')}
                  value={liveOps?.next_appointment_formatted || t('dashboard.liveOps.metric.none', 'None')}
                  subtitle={liveOps?.next_appointment_time
                    ? t('dashboard.liveOps.metric.timeToday', '{{time}} today', { time: format(new Date(liveOps.next_appointment_time), 'HH:mm', { locale: dateLocale }) })
                    : t('dashboard.liveOps.metric.nothingMore', 'nothing more today')}
                  icon={Clock}
                  variant="green"
                  delay={0.4}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                  <ArrowRight className="h-3 w-3 text-accent-foreground/80 group-hover:text-accent-foreground transition-colors group-hover:translate-x-0.5 transform duration-200" />
                </div>
                <div className="absolute inset-0 rounded-2xl border border-white/[0.08] group-hover:border-white/[0.14] transition-colors"></div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent
              className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50"
              side="top"
              align="center"
            >
              <p className="text-sm">
                {t('dashboard.liveOps.metric.tipNext', 'Click to view your full schedule in calendar week view. Shows time remaining until your next appointment.')}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Real-time System Status & Today's Planning - Mobile optimized */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8">
          {/* Enhanced System Status */}
          <div className="relative group">
            <div className="relative surface-raised rounded-2xl">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-muted/40 rounded-xl">
                    <Activity className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{t('dashboard.liveOps.sys.heading', 'Live System Status')}</h3>
                </div>

                <div className="space-y-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between p-4 bg-card/50 rounded-xl border border-white/[0.08] cursor-help relative">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 ${
                            calendarStatus.color === 'green' ? 'bg-success' :
                            calendarStatus.color === 'yellow' ? 'bg-warning' : 'bg-destructive'
                          } rounded-full ${calendarStatus.color === 'green' ? 'animate-pulse' : ''}`}></div>
                          <span className="text-sm font-medium text-foreground">{t('dashboard.liveOps.sys.calendarStatus', 'Calendar Status')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${calendarStatus.borderColor} ${calendarStatus.textColor} ${calendarStatus.bgColor}`}>
                            {statusLabel(calendarStatus.status)}
                          </Badge>
                          <Info className={`h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors`} />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      className={`max-w-sm bg-background/95 border ${calendarStatus.borderColor} text-foreground z-50`}
                      side="top"
                      align="center"
                    >
                      <p className="text-sm">
                        {calendarStatus.detail}. {calendarStatus.status === 'Online'
                          ? t('dashboard.liveOps.sys.calOnlineTip', 'All calendars are accepting new appointments.')
                          : calendarStatus.status === 'Partial'
                          ? t('dashboard.liveOps.sys.calPartialTip', 'Some calendars are offline. Check individual calendar settings.')
                          : t('dashboard.liveOps.sys.calOfflineTip', 'Customers cannot book new slots on offline calendars.')}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex items-center justify-between p-4 bg-card/50 rounded-xl border border-white/[0.08] relative transition-colors ${
                          bookingsAssistantStatus.clickable ? 'cursor-pointer hover:bg-white/[0.06]' : 'cursor-help'
                        }`}
                        onClick={bookingsAssistantStatus.clickable ? handleBookingAssistantClick : undefined}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 ${
                            bookingsAssistantStatus.color === 'green' ? 'bg-success' :
                            bookingsAssistantStatus.color === 'yellow' ? 'bg-warning' : 'bg-destructive'
                          } rounded-full ${bookingsAssistantStatus.color === 'green' ? 'animate-pulse' : ''}`}></div>
                          <span className="text-sm font-medium text-foreground">{t('dashboard.liveOps.sys.assistant', 'Bookings Assistant')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${bookingsAssistantStatus.borderColor} ${bookingsAssistantStatus.textColor} ${bookingsAssistantStatus.bgColor}`}>
                            {statusLabel(bookingsAssistantStatus.status)}
                          </Badge>
                          {bookingsAssistantStatus.clickable ? (
                            <Settings className={`h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors`} />
                          ) : (
                            <Info className={`h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors`} />
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      className={`max-w-sm bg-background/95 border ${bookingsAssistantStatus.borderColor} text-foreground z-50`}
                      side="top"
                      align="center"
                    >
                      <p className="text-sm">
                        {bookingsAssistantStatus.reason}. {t('dashboard.liveOps.sys.assistantTip', 'Your AI booking assistant helps customers book appointments via WhatsApp globally across all calendars.')}
                        {bookingsAssistantStatus.clickable && (
                          <span className="block mt-1 text-xs opacity-75">{t('dashboard.liveOps.sys.clickSettings', 'Click to open settings')}</span>
                        )}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between p-4 bg-card/50 rounded-xl border border-white/[0.08] cursor-help relative">
                        <div className="flex items-center gap-3">
                          <Zap className={`h-4 w-4 ${realtimeSyncStatus.textColor}`} />
                          <span className="text-sm font-medium text-foreground">{t('dashboard.liveOps.sys.realtimeSync', 'Real-time Sync')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${realtimeSyncStatus.borderColor} ${realtimeSyncStatus.textColor} ${realtimeSyncStatus.bgColor}`}>
                            {statusLabel(realtimeSyncStatus.status)}
                          </Badge>
                          <Info className={`h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors`} />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      className={`max-w-sm bg-background/95 border ${realtimeSyncStatus.borderColor} text-foreground z-50`}
                      side="top"
                      align="center"
                    >
                      <p className="text-sm">
                        {realtimeSyncStatus.reason}. {realtimeSyncStatus.detail}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Today's Planning - Now Clickable */}
          <div className="relative group">
            <div
              className="relative surface-raised rounded-2xl cursor-pointer hover:border-white/[0.14] transition-colors"
              onClick={handleTodayScheduleClick}
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-muted/40 rounded-xl">
                    <Calendar className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{t('dashboard.liveOps.plan.heading', "Today's Schedule")}</h3>
                  <ArrowRight className="h-4 w-4 text-accent-foreground/80 group-hover:text-accent-foreground group-hover:translate-x-1 transition-transform duration-150 ml-auto" />
                </div>

                {liveOps?.next_appointment_time ? (
                  <div className="space-y-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 bg-success/10 border border-white/[0.08] rounded-xl cursor-pointer relative group-hover:border-white/[0.14] transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-foreground mb-1">{t('dashboard.liveOps.plan.nextAppt', 'Next Appointment')}</p>
                              <p className="text-sm text-foreground font-mono">
                                {format(new Date(liveOps.next_appointment_time), 'EEE d MMM, HH:mm', { locale: dateLocale })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="bg-success/15 text-accent-foreground border-white/[0.12]"
                              >
                                {liveOps.next_appointment_formatted}
                              </Badge>
                              <Info className="h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors" />
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50"
                        side="top"
                        align="center"
                      >
                        <p className="text-sm">
                          {t('dashboard.liveOps.plan.nextApptTip', "Click to view your full schedule in calendar week view. See all today's appointments and manage your time.")}
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <div className="text-center p-4 bg-card/30 rounded-xl border border-white/[0.08]">
                      <p className="text-sm text-muted-foreground">
                        {t('dashboard.liveOps.plan.clickAnywhere', 'Click anywhere to view complete schedule')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-muted/40 rounded-2xl flex items-center justify-center border border-white/[0.08]">
                      <Calendar className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-foreground font-medium mb-1">{t('dashboard.liveOps.plan.freeDay', 'Free day today')}</p>
                    <p className="text-sm text-muted-foreground mb-4">{t('dashboard.liveOps.plan.noAppts', 'No appointments scheduled')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.liveOps.plan.clickCalendar', 'Click to view calendar')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
