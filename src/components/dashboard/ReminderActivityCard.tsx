import React from 'react';
import { format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { BellRing, Mail, MessageCircle, CheckCircle2, Clock3, AlertTriangle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useReminderActivity } from '@/hooks/dashboard/useReminderActivity';
import type { ReminderActivityItem, ReminderStatus } from '@/hooks/dashboard/useReminderActivity';

interface ReminderActivityCardProps {
  calendarIds: string[];
}

// SEQP1R6 (P1-7): the first real owner-facing surface for reminder status. Prior to this,
// `RemindersCard.tsx` (src/components/features/) was a static marketing mockup on the public
// `/features/reminders` page, zero real dashboard visibility existed anywhere. This card shows
// real sent/pending/stuck counts for the last REMINDER_ACTIVITY_WINDOW_DAYS (7) days, per-item
// detail (which booking, which channel, when), and a genuine empty state. RLS on
// booking_reminders_sent (SEQP1R6 migration) scopes every row to the caller's own tenant;
// this component adds no client-side tenant filtering of its own (none needed, none should
// exist: filtering "for the UI" instead of trusting RLS is exactly the kind of belt shown to
// have failed elsewhere in this project's history when the belt was trusted over the buckle).
export function ReminderActivityCard({ calendarIds }: ReminderActivityCardProps) {
  const { t, i18n } = useTranslation('dashboard');
  const dateLocale = i18n.language === 'nl' ? nl : enUS;
  const { data, isLoading, isError, refetch } = useReminderActivity(calendarIds);

  const statusMeta = (status: ReminderStatus) => {
    switch (status) {
      case 'sent':
        return {
          label: t('dashboard.reminders.status.sent', 'Sent'),
          icon: CheckCircle2,
          badgeClass: 'border-white/[0.12] text-accent-foreground bg-success/10',
        };
      case 'pending':
        return {
          label: t('dashboard.reminders.status.pending', 'Pending'),
          icon: Clock3,
          badgeClass: 'border-warning/30 text-warning-foreground bg-warning/10',
        };
      case 'pending_template_approval':
        return {
          label: t('dashboard.reminders.status.stuck', 'Awaiting WhatsApp approval'),
          icon: AlertTriangle,
          badgeClass: 'border-destructive/30 text-destructive-foreground bg-destructive/10',
        };
      default:
        return {
          label: status,
          icon: Info,
          badgeClass: 'border-white/[0.12] text-muted-foreground bg-muted/40',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="surface-raised shimmer rounded-2xl h-64" role="status" aria-label={t('dashboard.reminders.loading', 'Loading reminder activity')} />
    );
  }

  if (isError) {
    return (
      <div className="surface-raised rounded-2xl border border-white/[0.08] p-8 text-center">
        <div className="w-11 h-11 mx-auto mb-3 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-destructive-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-foreground">{t('dashboard.reminders.errTitle', "Couldn't load reminder activity")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('dashboard.reminders.errDesc', 'Check your connection and try again.')}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-md px-3 py-1.5 text-xs font-medium text-accent-foreground bg-primary/10 ring-1 ring-primary/20 hover:bg-primary/15 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t('dashboard.reminders.retry', 'Retry')}
        </button>
      </div>
    );
  }

  const summary = data;
  const hasActivity = !!summary && summary.items.length > 0;

  return (
    <TooltipProvider>
      <div className="relative group">
        <div className="relative surface-raised rounded-2xl">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-muted/40 rounded-xl">
                <BellRing className="h-5 w-5 text-accent-foreground" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{t('dashboard.reminders.heading', 'Reminder activity')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.reminders.subtitle', 'Last {{days}} days', { days: summary?.window_days ?? 7 })}
                </p>
              </div>
            </div>

            {/* Counts row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="relative w-full text-left rounded-xl border border-white/[0.08] bg-card/50 p-3 md:p-4 cursor-help outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <p className="text-2xl md:text-3xl font-semibold tabular-nums tracking-[-0.02em] text-foreground">{summary?.sent ?? 0}</p>
                    <p className="mt-0.5 text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-[0.04em]">
                      {t('dashboard.reminders.count.sent', 'Sent')}
                    </p>
                    <Info className="absolute top-2.5 right-2.5 h-3 w-3 text-subtle-foreground/80" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50" side="top" align="center">
                  <p className="text-sm">
                    {t('dashboard.reminders.sentTip', 'Reminders that were actually delivered to the customer by email or WhatsApp.')}
                  </p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="relative w-full text-left rounded-xl border border-white/[0.08] bg-card/50 p-3 md:p-4 cursor-help outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <p className="text-2xl md:text-3xl font-semibold tabular-nums tracking-[-0.02em] text-foreground">{summary?.pending ?? 0}</p>
                    <p className="mt-0.5 text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-[0.04em]">
                      {t('dashboard.reminders.count.pending', 'Pending')}
                    </p>
                    <Info className="absolute top-2.5 right-2.5 h-3 w-3 text-subtle-foreground/80" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50" side="top" align="center">
                  <p className="text-sm">
                    {t('dashboard.reminders.pendingTip', 'Claimed and still being retried. Most resolve within minutes; this is normal, ongoing activity.')}
                  </p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`relative w-full text-left rounded-xl border p-3 md:p-4 cursor-help outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      (summary?.stuck ?? 0) > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-white/[0.08] bg-card/50'
                    }`}
                  >
                    <p className={`text-2xl md:text-3xl font-semibold tabular-nums tracking-[-0.02em] ${
                      (summary?.stuck ?? 0) > 0 ? 'text-destructive-foreground' : 'text-foreground'
                    }`}>
                      {summary?.stuck ?? 0}
                    </p>
                    <p className="mt-0.5 text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-[0.04em]">
                      {t('dashboard.reminders.count.stuck', 'Stuck')}
                    </p>
                    <Info className="absolute top-2.5 right-2.5 h-3 w-3 text-subtle-foreground/80" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50" side="top" align="center">
                  <p className="text-sm">
                    {t('dashboard.reminders.stuckTip', 'Waiting on WhatsApp template approval. These retry automatically for about an hour, then stay here until approved.')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Per-item list or empty state */}
            {hasActivity ? (
              <ul className="space-y-2" aria-label={t('dashboard.reminders.listLabel', 'Recent reminders')}>
                {summary!.items.slice(0, 8).map((item: ReminderActivityItem) => {
                  const meta = statusMeta(item.status);
                  const StatusIcon = meta.icon;
                  const ChannelIcon = item.channel === 'email' ? Mail : MessageCircle;
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-card/30 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ChannelIcon className="h-4 w-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.customer_name || t('dashboard.reminders.unknownCustomer', 'Customer')}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {t('dashboard.reminders.appointmentAt', 'Appointment {{date}}', {
                              date: format(new Date(item.start_time), 'EEE d MMM, HH:mm', { locale: dateLocale }),
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline text-xs text-subtle-foreground tabular-nums">
                          {format(new Date(item.sent_at), 'd MMM, HH:mm', { locale: dateLocale })}
                        </span>
                        <Badge variant="outline" className={`gap-1 ${meta.badgeClass}`}>
                          <StatusIcon className="h-3 w-3" aria-hidden="true" />
                          {meta.label}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted/40 rounded-2xl flex items-center justify-center border border-white/[0.08]">
                  <BellRing className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="font-serif italic text-lg text-foreground/90 mb-1">
                  {t('dashboard.reminders.emptyTitle', 'No reminders sent yet')}
                </p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {t(
                    'dashboard.reminders.emptyDesc',
                    'Once appointment reminders are enabled and a booking comes due, activity will show up here.'
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
