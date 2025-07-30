import { useState } from 'react';
import { Calendar, CreditCard, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAccessControl } from '@/hooks/useAccessControl';
import { SubscriptionModal } from '@/components/SubscriptionModal';

interface AppointmentUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppointmentUpgradeModal({ isOpen, onClose }: AppointmentUpgradeModalProps) {
  const { userStatus } = useAccessControl();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleUpgrade = () => {
    onClose();
    setShowSubscriptionModal(true);
  };

  const isExpiredTrial = userStatus.userType === 'expired_trial';
  const isCanceledInactive = userStatus.userType === 'canceled_and_inactive';

  const getModalContent = () => {
    if (isExpiredTrial) {
      return {
        title: "Trial Expired - Upgrade Required",
        description: "Your free trial has ended. Upgrade to continue creating appointments and managing your bookings.",
        buttonText: "Upgrade Now",
        icon: <CreditCard className="h-6 w-6" />
      };
    }
    
    if (isCanceledInactive) {
      return {
        title: "Reactivate Your Account",
        description: "Your subscription has been canceled. Reactivate your account to continue creating appointments.",
        buttonText: "Reactivate Account",
        icon: <RefreshCw className="h-6 w-6" />
      };
    }

    return {
      title: "Subscription Required",
      description: "An active subscription is required to create new appointments.",
      buttonText: "View Plans",
      icon: <Calendar className="h-6 w-6" />
    };
  };

  const content = getModalContent();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              {content.icon}
            </div>
            
            <DialogTitle className="text-xl font-semibold">
              {content.title}
            </DialogTitle>
            
            <DialogDescription className="text-base text-muted-foreground">
              {content.description}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-6">
            <Button 
              onClick={handleUpgrade} 
              className="w-full h-11 font-medium"
            >
              {content.buttonText}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full h-11"
            >
              Close
            </Button>
          </div>
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