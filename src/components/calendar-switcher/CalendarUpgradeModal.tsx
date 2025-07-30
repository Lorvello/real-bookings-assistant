import React, { useState } from 'react';
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
  const { userStatus } = useUserStatus();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleUpgrade = () => {
    onOpenChange(false);
    setShowSubscriptionModal(true);
  };

  const getTitle = () => {
    if (userStatus.userType === 'expired_trial') {
      return 'Calendar Creation Restricted';
    }
    if (userStatus.userType === 'canceled_and_inactive') {
      return 'Reactivate to Create Calendars';
    }
    return 'Upgrade Required';
  };

  const getDescription = () => {
    if (userStatus.userType === 'expired_trial') {
      return 'Your trial has expired. Upgrade now to create new calendars and continue booking appointments.';
    }
    if (userStatus.userType === 'canceled_and_inactive') {
      return 'Reactivate your account to create new calendars and access all booking features.';
    }
    return 'Upgrade your subscription to create new calendars.';
  };

  const getButtonText = () => {
    if (userStatus.userType === 'expired_trial') {
      return 'Upgrade Now';
    }
    if (userStatus.userType === 'canceled_and_inactive') {
      return 'Reactivate Subscription';
    }
    return 'Upgrade';
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
              Cancel
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