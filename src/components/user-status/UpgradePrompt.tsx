import React, { useState } from 'react';
import { ArrowUp, CreditCard, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserStatus } from '@/types/userStatus';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { supabase } from '@/integrations/supabase/client';
import { getStripeConfig } from '@/utils/stripeConfig';

interface UpgradePromptProps {
  userStatus: UserStatus;
  isExpanded: boolean;
  onUpgrade?: () => void;
}

// Lapsed states where the customer ALREADY has payment details on file → send them
// to the Stripe billing portal (update card / reactivate / manage), NOT a fresh
// "choose your plan" checkout. expired_trial never subscribed, so it picks a plan.
const PAID_LAPSED_TYPES = ['missed_payment', 'canceled_subscriber', 'canceled_and_inactive'];

export function UpgradePrompt({ userStatus, isExpanded, onUpgrade }: UpgradePromptProps) {
  const { userType, needsUpgrade, isCanceled } = userStatus;
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!needsUpgrade && !isCanceled) return null;

  const openBillingPortal = async () => {
    setLoading(true);
    try {
      const { mode } = getStripeConfig();
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: { mode },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        return;
      }
      throw new Error('No portal URL returned');
    } catch {
      // Graceful fallback: no Stripe customer / portal unavailable → let them pick a plan.
      setShowSubscriptionModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = () => {
    if (onUpgrade) {
      onUpgrade();
      return;
    }
    // Returning customers (lapsed paid) → manage-subscription portal; trial → choose plan.
    if (PAID_LAPSED_TYPES.includes(userType)) {
      openBillingPortal();
    } else {
      setShowSubscriptionModal(true);
    }
  };

  const getButtonText = () => {
    if (userType === 'expired_trial') return 'Upgrade Now';
    if (userType === 'canceled_subscriber') return 'Reactivate';
    if (userType === 'canceled_and_inactive') return 'Reactivate';
    if (userType === 'missed_payment') return 'Fix Payment';
    return 'Upgrade';
  };

  const getButtonIcon = () => {
    if (userType === 'canceled_subscriber' || userType === 'canceled_and_inactive') return <RefreshCw className="h-4 w-4" />;
    if (userType === 'missed_payment') return <CreditCard className="h-4 w-4" />;
    return <ArrowUp className="h-4 w-4" />;
  };

  const getButtonColor = () => {
    if (userType === 'expired_trial') return 'bg-red-600 hover:bg-red-700';
    if (userType === 'canceled_subscriber') return 'bg-yellow-600 hover:bg-yellow-700';
    if (userType === 'canceled_and_inactive') return 'bg-red-600 hover:bg-red-700';
    if (userType === 'missed_payment') return 'bg-red-600 hover:bg-red-700';
    return 'bg-green-600 hover:bg-green-700';
  };

  return (
    <>
      <div className="px-3 py-2 mb-4">
        <Button
          onClick={handleUpgradeClick}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 ${getButtonColor()}`}
          size="sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : getButtonIcon()}
          {isExpanded ? (loading ? 'Loading…' : getButtonText()) : ''}
        </Button>
        {isExpanded && (userType === 'expired_trial' || userType === 'canceled_and_inactive') && (
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