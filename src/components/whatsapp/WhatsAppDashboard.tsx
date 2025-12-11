
import React from 'react';
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
  const { currentCount, maxContacts, canAddMore } = useWhatsAppLimits(calendarId);
  const { accessControl } = useAccessControl();
  
  // Initialize enhanced webhook processor
  useWebhookProcessor(calendarId);
  
  return (
    <div className="h-full">
      {/* Service Status Indicator */}
      <WhatsAppServiceStatus calendarId={calendarId} />
      
      {/* WhatsApp Contact Limit Warning */}
      {!canAddMore && accessControl.canAccessWhatsApp && (
        <div className="mb-4">
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
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp contacts: {currentCount}/{maxContacts}</span>
          </div>
        </div>
      )}
      
      {/* Unified WhatsApp View */}
      <WhatsAppUnifiedView calendarId={calendarId} />
    </div>
  );
}
