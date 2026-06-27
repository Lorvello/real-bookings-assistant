import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { SubscriptionModal } from '@/components/SubscriptionModal';

interface WhatsAppServiceStatusProps {
  calendarId: string;
}

export function WhatsAppServiceStatus({ calendarId }: WhatsAppServiceStatusProps) {
  const { t } = useTranslation('appPages');
  const { userStatus, accessControl } = useUserStatus();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Show status indicator if WhatsApp service is not available
  if (userStatus.isExpired || !accessControl.canAccessWhatsApp) {
    return (
      <Card className="border-border/50 bg-muted/20 mb-6">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
              <AlertCircle aria-hidden="true" className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-foreground text-lg">
                {t('convPage.serviceInactiveTitle', 'WhatsApp Service Inactive')}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1.5">
                {userStatus.isExpired
                  ? t('convPage.serviceInactiveTrialExpired', 'Your trial has expired. Upgrade to reactivate the WhatsApp booking assistant.')
                  : t('convPage.serviceInactiveNoSubscription', 'WhatsApp booking assistant requires an active subscription.')}
              </CardDescription>
            </div>
            <Badge variant="destructive" className="shrink-0 bg-destructive/10 text-destructive border-destructive/20">
              <Lock className="h-3 w-3 mr-1" />
              {t('convPage.serviceBadgeInactive', 'Inactive')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 mb-4 border border-border/50">
            <p className="text-sm font-medium text-foreground mb-3">
              {t('convPage.whatAffectedHeading', "What's affected:")}
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>• {t('convPage.newBookingsDisabled', 'New WhatsApp bookings are disabled')}</li>
              <li>• {t('convPage.automatedResponsesPaused', 'Automated WhatsApp responses are paused')}</li>
              <li>• {t('convPage.aiAssistantInactive', 'AI booking assistant is inactive')}</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{t('convPage.whatStillWorksHeading', 'What still works:')}</strong> {t('convPage.canViewConversations', 'You can view existing conversations and contact history below.')}
            </p>
          </div>
          <Button 
            onClick={() => setShowSubscriptionModal(true)}
            variant="default"
            className="w-full sm:w-auto"
          >
            {t('convPage.upgradeToReactivateButton', 'Upgrade to Reactivate Service')}
          </Button>
        </CardContent>
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          userType={userStatus.userType}
        />
      </Card>
    );
  }

  return (
    <SubscriptionModal
      isOpen={showSubscriptionModal}
      onClose={() => setShowSubscriptionModal(false)}
      userType={userStatus.userType}
    />
  );
}