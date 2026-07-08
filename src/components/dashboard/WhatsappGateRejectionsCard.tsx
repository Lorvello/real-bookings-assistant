import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, MessageCircleOff } from 'lucide-react';
import {
  useWhatsappGateRejections,
  WHATSAPP_GATE_REJECTIONS_WINDOW_DAYS,
  WHATSAPP_GATE_REJECTIONS_MAX_ITEMS,
} from '@/hooks/dashboard/useWhatsappGateRejections';
import type { WhatsappGateRejectionItem } from '@/hooks/dashboard/useWhatsappGateRejections';

interface WhatsappGateRejectionsCardProps {
  calendarIds: string[];
}

// WHATSAPP_E2E_TEST_INFRA Item 3: today a dropped real inbound WhatsApp message (entitlement or
// bot-toggle gate) is a buried info-level row in webhook_security_logs with no dashboard
// visibility, which is how a real message went unnoticed for days before this initiative. Same
// "one signal among several" placement as ReminderActivityCard/ActivityLogCard, no redesign.
// Renders nothing when there is nothing to escalate (unlike its siblings, an empty state here
// would just be noise on every dashboard that has never had a blocked message).
export function WhatsappGateRejectionsCard({ calendarIds }: WhatsappGateRejectionsCardProps) {
  const { t, i18n } = useTranslation('dashboard');
  const dateLocale = i18n.language === 'nl' ? nl : enUS;
  const { data, isLoading, isError, refetch } = useWhatsappGateRejections(calendarIds);

  const label = (item: WhatsappGateRejectionItem) =>
    item.type === 'entitlement'
      ? t('dashboard.gateRejections.entitlement', 'Blocked: subscription not active')
      : t('dashboard.gateRejections.botOff', 'Blocked: WhatsApp assistant is turned off');

  if (isLoading) {
    return null;
  }

  if (isError) {
    return (
      <div className="surface-raised rounded-2xl border border-white/[0.08] p-6 text-center">
        <p className="text-sm font-medium text-foreground">
          {t('dashboard.gateRejections.errTitle', "Couldn't load blocked WhatsApp messages")}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-md px-3 py-1.5 text-xs font-medium text-accent-foreground bg-primary/10 ring-1 ring-primary/20 hover:bg-primary/15 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t('dashboard.gateRejections.retry', 'Retry')}
        </button>
      </div>
    );
  }

  const items = data?.items ?? [];
  const windowDays = data?.window_days ?? WHATSAPP_GATE_REJECTIONS_WINDOW_DAYS;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="relative group">
      <div className="relative surface-raised rounded-2xl border border-warning/20">
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-warning/10 rounded-xl">
              <ShieldAlert className="h-5 w-5 text-warning-foreground" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {t('dashboard.gateRejections.heading', 'Blocked WhatsApp messages')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.gateRejections.subtitle', '{{count}} in the last {{days}} days', {
                  count: items.length,
                  days: windowDays,
                })}
              </p>
            </div>
          </div>

          <ul className="space-y-2" aria-label={t('dashboard.gateRejections.listLabel', 'Blocked WhatsApp messages')}>
            {items.slice(0, WHATSAPP_GATE_REJECTIONS_MAX_ITEMS).map((item, idx) => (
              <li
                key={`${item.type}-${item.created_at}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-card/30 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageCircleOff className="h-4 w-4 shrink-0 text-warning-foreground" aria-hidden="true" />
                  <p className="text-sm text-foreground truncate">{label(item)}</p>
                </div>
                <span className="text-xs text-subtle-foreground tabular-nums shrink-0">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: dateLocale })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
