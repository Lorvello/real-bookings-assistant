import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
  History,
  CalendarPlus,
  CalendarClock,
  CalendarX,
  UserX,
  MessageCircle,
  LayoutDashboard,
  Bot,
  User,
  AlertTriangle,
  Undo2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAgentActions, ACTIVITY_LOG_WINDOW_DAYS } from '@/hooks/dashboard/useAgentActions';
import type { AgentActionItem, AgentActionType } from '@/hooks/dashboard/useAgentActions';

interface ActivityLogCardProps {
  calendarIds: string[];
}

// SEQP2R7 (P2-2b): the first owner-facing surface for `agent_actions`
// (book/reschedule/cancel/no_show), built on the same "Live Operations"
// premium bar as `ReminderActivityCard.tsx`. Read-only preview this round:
// each row carries a disabled override affordance (Undo2 icon, greyed) so the
// design already reads as "override is coming" without any real undo/RPC
// logic wired (that is P2-3, a separate round, per the round brief).
export function ActivityLogCard({ calendarIds }: ActivityLogCardProps) {
  const { t, i18n } = useTranslation('dashboard');
  const dateLocale = i18n.language === 'nl' ? nl : enUS;
  const { data, isLoading, isError, refetch } = useAgentActions(calendarIds);

  const actionMeta = (actionType: AgentActionType) => {
    switch (actionType) {
      case 'book':
        return {
          label: t('dashboard.activityLog.action.book', 'Booked'),
          icon: CalendarPlus,
          badgeClass: 'border-white/[0.12] text-accent-foreground bg-success/10',
        };
      case 'reschedule':
        return {
          label: t('dashboard.activityLog.action.reschedule', 'Rescheduled'),
          icon: CalendarClock,
          badgeClass: 'border-warning/30 text-warning-foreground bg-warning/10',
        };
      case 'cancel':
        return {
          label: t('dashboard.activityLog.action.cancel', 'Cancelled'),
          icon: CalendarX,
          badgeClass: 'border-destructive/30 text-destructive-foreground bg-destructive/10',
        };
      case 'no_show':
        return {
          label: t('dashboard.activityLog.action.noShow', 'No-show'),
          icon: UserX,
          badgeClass: 'border-destructive/30 text-destructive-foreground bg-destructive/10',
        };
      default:
        return {
          label: actionType,
          icon: History,
          badgeClass: 'border-white/[0.12] text-muted-foreground bg-muted/40',
        };
    }
  };

  // Translates old_value -> new_value jsonb into one plain sentence per action
  // type, instead of the raw JSON an owner should never have to parse.
  const summarize = (item: AgentActionItem): string => {
    const oldStart = item.old_value?.start_time as string | undefined;
    const newStart = item.new_value?.start_time as string | undefined;
    const fmt = (iso: string) => format(new Date(iso), 'EEE d MMM, HH:mm', { locale: dateLocale });

    switch (item.action_type) {
      case 'book':
        return newStart
          ? t('dashboard.activityLog.summary.book', 'Booked for {{date}}', { date: fmt(newStart) })
          : t('dashboard.activityLog.summary.bookGeneric', 'New appointment booked');
      case 'reschedule':
        return oldStart && newStart
          ? t('dashboard.activityLog.summary.reschedule', 'Rescheduled from {{from}} to {{to}}', {
              from: fmt(oldStart),
              to: fmt(newStart),
            })
          : t('dashboard.activityLog.summary.rescheduleGeneric', 'Appointment moved to a new time');
      case 'cancel': {
        const refundRequired = item.new_value?.payment_status === 'refund_required';
        return refundRequired
          ? t('dashboard.activityLog.summary.cancelRefund', 'Appointment cancelled, refund required')
          : t('dashboard.activityLog.summary.cancel', 'Appointment cancelled');
      }
      case 'no_show':
        return t('dashboard.activityLog.summary.noShow', 'Appointment marked as no-show');
      default:
        return t('dashboard.activityLog.summary.unknown', 'Booking updated');
    }
  };

  if (isLoading) {
    return (
      <div className="surface-raised shimmer rounded-2xl h-64" role="status" aria-label={t('dashboard.activityLog.loading', 'Loading activity log')} />
    );
  }

  if (isError) {
    return (
      <div className="surface-raised rounded-2xl border border-white/[0.08] p-8 text-center">
        <div className="w-11 h-11 mx-auto mb-3 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-destructive-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-foreground">{t('dashboard.activityLog.errTitle', "Couldn't load activity log")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('dashboard.activityLog.errDesc', 'Check your connection and try again.')}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-md px-3 py-1.5 text-xs font-medium text-accent-foreground bg-primary/10 ring-1 ring-primary/20 hover:bg-primary/15 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t('dashboard.activityLog.retry', 'Retry')}
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
                <History className="h-5 w-5 text-accent-foreground" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{t('dashboard.activityLog.heading', 'Activity log')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.activityLog.subtitle', 'Last {{days}} days', { days: summary?.window_days ?? ACTIVITY_LOG_WINDOW_DAYS })}
                </p>
              </div>
            </div>

            {hasActivity ? (
              <ul className="space-y-2 stagger-fade" aria-label={t('dashboard.activityLog.listLabel', 'Recent agent activity')}>
                {summary!.items.map((item) => {
                  const meta = actionMeta(item.action_type);
                  const ActionIcon = meta.icon;
                  const isAgent = item.actor === 'agent';
                  const isWhatsapp = item.channel === 'whatsapp';

                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-card/30 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ActionIcon className="h-4 w-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.customer_name || t('dashboard.activityLog.unknownCustomer', 'Customer')}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{summarize(item)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isWhatsapp && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="hidden sm:inline-flex items-center justify-center h-6 w-6 rounded-md border border-white/[0.08] bg-card/50 text-subtle-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              >
                                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                <span className="sr-only">{t('dashboard.activityLog.channelWhatsapp', 'Via WhatsApp conversation')}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50" side="top" align="center">
                              <p className="text-sm">{t('dashboard.activityLog.channelWhatsappTip', 'Triggered by the customer in a WhatsApp conversation with your assistant.')}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              tabIndex={0}
                              className={`gap-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                                isAgent
                                  ? 'border-white/[0.12] text-muted-foreground bg-muted/40'
                                  : 'border-warning/30 text-warning-foreground bg-warning/10'
                              }`}
                            >
                              {isAgent ? <Bot className="h-3 w-3" aria-hidden="true" /> : <User className="h-3 w-3" aria-hidden="true" />}
                              {isAgent ? t('dashboard.activityLog.actor.agent', 'Agent') : t('dashboard.activityLog.actor.owner', 'You')}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50" side="top" align="center">
                            <p className="text-sm">
                              {isAgent
                                ? t('dashboard.activityLog.actorAgentTip', 'Performed automatically by your WhatsApp booking assistant.')
                                : t('dashboard.activityLog.actorOwnerTip', 'Performed by you from the dashboard.')}
                            </p>
                          </TooltipContent>
                        </Tooltip>

                        <span className="hidden sm:inline text-xs text-subtle-foreground tabular-nums" title={format(new Date(item.created_at), 'd MMM yyyy, HH:mm', { locale: dateLocale })}>
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: dateLocale })}
                        </span>

                        <Badge variant="outline" className={`gap-1 hidden md:inline-flex ${meta.badgeClass}`}>
                          {meta.label}
                        </Badge>

                        {/* Preview-only affordance for P2-3's override/undo (no real logic
                            wired yet, per this round's explicit scope limit). */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              disabled
                              aria-disabled="true"
                              className="hidden lg:inline-flex items-center justify-center h-6 w-6 rounded-md border border-white/[0.06] text-subtle-foreground/50 cursor-not-allowed"
                            >
                              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="sr-only">{t('dashboard.activityLog.undoComingSoon', 'Undo (coming soon)')}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50" side="top" align="center">
                            <p className="text-sm">{t('dashboard.activityLog.undoComingSoonTip', 'Overriding an agent action from here is coming soon.')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted/40 rounded-2xl flex items-center justify-center border border-white/[0.08]">
                  <LayoutDashboard className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="font-serif italic text-lg text-foreground/90 mb-1">
                  {t('dashboard.activityLog.emptyTitle', 'No activity yet')}
                </p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {t(
                    'dashboard.activityLog.emptyDesc',
                    'Once your assistant books, reschedules or cancels an appointment, it will show up here.'
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
