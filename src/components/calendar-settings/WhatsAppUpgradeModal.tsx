import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { UserType } from '@/types/userStatus';

interface WhatsAppUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: UserType;
}

export function WhatsAppUpgradeModal({ isOpen, onClose, userType }: WhatsAppUpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  const getModalContent = () => {
    const isExpiredTrial = userType === 'expired_trial';
    const isCanceledInactive = userType === 'canceled_and_inactive';

    return {
      title: "WhatsApp Bot Access Restricted",
      description: isExpiredTrial 
        ? "Your trial has expired. Upgrade to access your WhatsApp booking assistant and start automating your bookings."
        : "Reactivate your subscription to use your WhatsApp booking assistant and automate your customer interactions.",
      buttonText: isExpiredTrial ? "Upgrade Now" : "Reactivate Subscription",
      buttonColor: isExpiredTrial ? "bg-red-600 hover:bg-red-700" : "bg-yellow-600 hover:bg-yellow-700"
    };
  };

  const content = getModalContent();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              {content.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {content.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleUpgrade}
            className={`w-full flex items-center justify-center gap-2 text-white font-medium ${content.buttonColor}`}
          >
            {content.buttonText}
            <ArrowRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}