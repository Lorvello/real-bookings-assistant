
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Zap } from 'lucide-react';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { useTranslation } from 'react-i18next';

export const WhatsAppNotAvailable: React.FC = () => {
  const { t } = useTranslation('appPages');
  const { userStatus } = useUserStatus();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const getTitle = () => {
    switch (userStatus.userType) {
      case 'expired_trial':
        return t('waPage.notAvailable.title.expired', 'Your WhatsApp Booking Agent is Not Active');
      case 'canceled_and_inactive':
        return t('waPage.notAvailable.title.canceled', 'Your WhatsApp Booking Agent is Not Active');
      default:
        return t('waPage.notAvailable.title.default', 'WhatsApp Booking Agent Unavailable');
    }
  };

  const getDescription = () => {
    switch (userStatus.userType) {
      case 'expired_trial':
        return t('waPage.notAvailable.desc.expired', 'Your trial has expired. Upgrade now to reactivate your WhatsApp booking assistant and continue receiving bookings via WhatsApp.');
      case 'canceled_and_inactive':
        return t('waPage.notAvailable.desc.canceled', 'Your subscription has been canceled and has expired. Resubscribe to reactivate your WhatsApp booking assistant.');
      default:
        return t('waPage.notAvailable.desc.default', 'The WhatsApp booking agent is currently not available for your account.');
    }
  };

  const getActionText = () => {
    switch (userStatus.userType) {
      case 'expired_trial':
        return t('waPage.notAvailable.action.upgrade', 'Upgrade Now');
      case 'canceled_and_inactive':
        return t('waPage.notAvailable.action.resubscribe', 'Resubscribe');
      default:
        return t('waPage.notAvailable.action.learnMore', 'Learn More');
    }
  };

  const handleActionClick = () => {
    setShowSubscriptionModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="surface-raised rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-white/[0.04] border border-white/[0.08] p-2.5">
            <MessageCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-[-0.02em] text-foreground">
              {getTitle()}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('waPage.notAvailable.subtitle', 'Upgrade to activate your WhatsApp booking assistant')}</p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-base md:text-lg font-medium text-foreground">
            {t('waPage.notAvailable.mainTitle', 'Reactivate Your WhatsApp Booking Agent')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {getDescription()}
            </p>
          </div>

          <div className="bg-muted/20 border border-border rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <Zap className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-base font-medium text-foreground mb-4">
                  {t('waPage.notAvailable.features.title', 'WhatsApp Booking Agent Features')}
                </h3>
                <ul className="text-muted-foreground space-y-3">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0"></span>
                    {t('waPage.notAvailable.features.item1', '24/7 automated booking responses')}
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0"></span>
                    {t('waPage.notAvailable.features.item2', 'Intelligent appointment scheduling')}
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0"></span>
                    {t('waPage.notAvailable.features.item3', 'Real-time availability checking')}
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0"></span>
                    {t('waPage.notAvailable.features.item4', 'Customer communication management')}
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0"></span>
                    {t('waPage.notAvailable.features.item5', 'Seamless calendar integration')}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button className="flex-1" size="lg" onClick={handleActionClick}>
              {getActionText()}
            </Button>
            <Button asChild variant="outline" size="lg" className="flex-1">
              <a href="mailto:support@bookingsassistant.com">{t('waPage.notAvailable.contactSupport', 'Contact Support')}</a>
            </Button>
          </div>

          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {t('waPage.notAvailable.supportHint', 'Need help? Contact our support team for assistance with your subscription.')}
            </p>
          </div>
        </CardContent>
      </Card>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        userType={userStatus.userType}
      />
    </div>
  );
};
