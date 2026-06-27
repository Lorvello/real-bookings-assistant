import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { SubscriptionModal } from '@/components/SubscriptionModal';

interface CalendarUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarUpgradeModal({ open, onOpenChange }: CalendarUpgradeModalProps) {
  const { t } = useTranslation('appPages');
  const { userStatus } = useUserStatus();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleUpgrade = () => {
    onOpenChange(false);
    setShowSubscriptionModal(true);
  };

  const getTitle = () => {
    if (userStatus.userType === 'expired_trial') {
      return t('calPage.upgradeModal.restricted.title', 'Calendar Creation Restricted');
    }
    if (userStatus.userType === 'canceled_and_inactive') {
      return t('calPage.upgradeModal.reactivate.title', 'Reactivate to Create Calendars');
    }
    return t('calPage.upgradeModal.default.title', 'Upgrade Required');
  };

  const getDescription = () => {
    if (userStatus.userType === 'expired_trial') {
      return t('calPage.upgradeModal.restricted.expiredTrial', 'Your trial has expired. Upgrade now to create new calendars and continue booking appointments.');
    }
    if (userStatus.userType === 'canceled_and_inactive') {
      return t('calPage.upgradeModal.reactivate.description', 'Reactivate your account to create new calendars and access all booking features.');
    }
    return t('calPage.upgradeModal.default.description', 'Upgrade your subscription to create new calendars.');
  };

  const getButtonText = () => {
    if (userStatus.userType === 'expired_trial') {
      return t('calPage.upgradeModal.upgrade.button', 'Upgrade Now');
    }
    if (userStatus.userType === 'canceled_and_inactive') {
      return t('calPage.upgradeModal.reactivate.button', 'Reactivate Subscription');
    }
    return t('calPage.upgradeModal.default.button', 'Upgrade');
  };

  const getButtonIcon = () => {
    if (userStatus.userType === 'canceled_and_inactive') {
      return <RefreshCw className="h-4 w-4" />;
    }
    return <ArrowUp className="h-4 w-4" />;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getButtonIcon()}
              {getTitle()}
            </DialogTitle>
            <DialogDescription>
              {getDescription()}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('calPage.upgradeModal.cancelButton', 'Cancel')}
            </Button>
            <Button onClick={handleUpgrade} className="flex items-center gap-2">
              {getButtonIcon()}
              {getButtonText()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        userType={userStatus.userType}
      />
    </>
  );
}