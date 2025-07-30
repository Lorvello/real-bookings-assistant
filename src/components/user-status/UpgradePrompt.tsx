import React, { useState } from 'react';
import { ArrowUp, CreditCard, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserStatus } from '@/types/userStatus';
import { SubscriptionModal } from '@/components/SubscriptionModal';

interface UpgradePromptProps {
  userStatus: UserStatus;
  isExpanded: boolean;
  onUpgrade?: () => void;
}

export function UpgradePrompt({ userStatus, isExpanded, onUpgrade }: UpgradePromptProps) {
  const { userType, needsUpgrade, isCanceled } = userStatus;
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  if (!needsUpgrade && !isCanceled) return null;

  const handleUpgradeClick = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      setShowSubscriptionModal(true);
    }
  };

  const getButtonText = () => {
    if (userType === 'expired_trial') return 'Upgrade Now';
    if (userType === 'canceled_subscriber') return 'Reactivate';
    return 'Upgrade';
  };

  const getButtonIcon = () => {
    if (userType === 'canceled_subscriber') return <RefreshCw className="h-4 w-4" />;
    return <ArrowUp className="h-4 w-4" />;
  };

  const getButtonColor = () => {
    if (userType === 'expired_trial') return 'bg-red-600 hover:bg-red-700';
    if (userType === 'canceled_subscriber') return 'bg-yellow-600 hover:bg-yellow-700';
    return 'bg-green-600 hover:bg-green-700';
  };

  return (
    <>
      <div className="px-3 py-2 mb-4">
        <Button
          onClick={handleUpgradeClick}
          className={`w-full flex items-center justify-center gap-2 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 ${getButtonColor()}`}
          size="sm"
        >
          {getButtonIcon()}
          {isExpanded ? getButtonText() : ''}
        </Button>
        {isExpanded && userType === 'expired_trial' && (
          <p className="text-xs text-gray-400 text-center mt-2">
            Limited access until upgrade
          </p>
        )}
      </div>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        userType={userType}
      />
    </>
  );
}