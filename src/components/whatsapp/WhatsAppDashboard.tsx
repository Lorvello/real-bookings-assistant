
import React from 'react';
import { useTranslation } from 'react-i18next';
import { WhatsAppUnifiedView } from './WhatsAppUnifiedView';
import { WhatsAppServiceStatus } from './WhatsAppServiceStatus';
import { useWebhookProcessor } from '@/hooks/useWebhookProcessor';
import { useWhatsAppLimits } from '@/hooks/useSubscriptionLimits';
import { useAccessControl } from '@/hooks/useAccessControl';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { MessageCircle } from 'lucide-react';

interface WhatsAppDashboardProps {
  calendarId: string;
}

export function WhatsAppDashboard({ calendarId }: WhatsAppDashboardProps) {
  const { t } = useTranslation('appPages');
  const { currentCount, maxContacts, canAddMore } = useWhatsAppLimits(calendarId);
  const { accessControl } = useAccessControl();
  
  // Initialize enhanced webhook processor
  useWebhookProcessor(calendarId);
  
  return (
    <div className="h-full flex flex-col">
      {/* Service Status Indicator */}
      <div className="shrink-0">
        <WhatsAppServiceStatus calendarId={calendarId} />
      </div>
      
      {/* WhatsApp Contact Limit Warning */}
      {!canAddMore && accessControl.canAccessWhatsApp && (
        <div className="mb-4 shrink-0">
          <UpgradePrompt 
            feature="WhatsApp Contacts"
            currentUsage={`${currentCount}/${maxContacts}`}
            limit={`${maxContacts} contact${maxContacts === 1 ? '' : 's'}`}
            description="You've reached your WhatsApp contact limit. Upgrade to Professional to manage unlimited contacts."
          />
        </div>
      )}
      
      {/* Usage indicator for contacts */}
      {canAddMore && maxContacts !== null && (
        <div className="mb-4 shrink-0 rounded-xl border border-white/[0.06] bg-card/40 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle aria-hidden="true" className="h-4 w-4 text-primary" />
              <span>{t('convPage.whatsappContactsLabel', 'WhatsApp contacts')}</span>
            </div>
            <span className="text-sm font-medium text-foreground tabular-nums">
              {currentCount}<span className="text-muted-foreground">/{maxContacts}</span>
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${Math.min(100, maxContacts ? (currentCount / maxContacts) * 100 : 0)}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Unified WhatsApp View - takes remaining space */}
      <div className="flex-1 min-h-0">
        <WhatsAppUnifiedView calendarId={calendarId} />
      </div>
    </div>
  );
}
