import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, Zap, Crown } from 'lucide-react';
import { UserStatus } from '@/types/userStatus';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';

interface StatusIndicatorProps {
  userStatus: UserStatus;
  isExpanded: boolean;
}

const formatSubscriptionTier = (tier?: string) => {
  if (!tier) return null;
  
  switch (tier) {
    case 'starter':
      return 'Starter Plan';
    case 'professional':
      return 'Professional Plan';
    case 'enterprise':
      return 'Enterprise Plan';
    default:
      return null;
  }
};

const getTierColor = (tier?: string) => {
  switch (tier) {
    case 'starter':
      return 'text-green-400';
    case 'professional':
      return 'text-blue-400';
    case 'enterprise':
      return 'text-yellow-400';
    default:
      return 'text-gray-400';
  }
};

export function StatusIndicator({ userStatus, isExpanded }: StatusIndicatorProps) {
  const { userType, statusMessage, statusColor, daysRemaining } = userStatus;
  const navigate = useNavigate();
  const { profile } = useProfile();

  // Local state to cache tier info and prevent disappearing during navigation
  const [cachedTierInfo, setCachedTierInfo] = useState<{
    tier: string | null;
    isActive: boolean;
  }>({ tier: null, isActive: false });

  // Update cached tier info when profile changes
  useEffect(() => {
    if (profile?.subscription_tier && profile?.subscription_status === 'active') {
      setCachedTierInfo({
        tier: profile.subscription_tier,
        isActive: true
      });
    }
  }, [profile?.subscription_tier, profile?.subscription_status]);

  // Use cached data or fallback to current profile data
  const tierDisplay = formatSubscriptionTier(cachedTierInfo.tier || profile?.subscription_tier);
  const hasActiveSubscription = cachedTierInfo.isActive || profile?.subscription_status === 'active';

  const getIcon = () => {
    switch (userType) {
      case 'trial':
        return <Zap className={`h-4 w-4 ${getColorClass()}`} />;
      case 'expired_trial':
        return <XCircle className={`h-4 w-4 ${getColorClass()}`} />;
      case 'subscriber':
        return <CheckCircle className={`h-4 w-4 ${getColorClass()}`} />;
      case 'canceled_subscriber':
        return <AlertTriangle className={`h-4 w-4 ${getColorClass()}`} />;
      case 'setup_incomplete':
        return <Clock className={`h-4 w-4 ${getColorClass()}`} />;
      default:
        return <Clock className={`h-4 w-4 ${getColorClass()}`} />;
    }
  };

  const getColorClass = () => {
    switch (statusColor) {
      case 'green':
        return 'text-green-400';
      case 'yellow':
        return 'text-yellow-400';
      case 'red':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getBgColor = () => {
    switch (statusColor) {
      case 'green':
        return 'bg-green-900/20 border-green-700';
      case 'yellow':
        return 'bg-yellow-900/20 border-yellow-700';
      case 'red':
        return 'bg-red-900/20 border-red-700';
      default:
        return 'bg-gray-700/50 border-gray-600';
    }
  };

  return (
    <div className={`px-3 py-2 rounded-lg border mb-4 ${getBgColor()}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        {isExpanded && (
          <div className="ml-3 min-w-0 flex-1">
            {userType === 'setup_incomplete' ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-yellow-400">
                  {daysRemaining} Days Free Trial Remaining
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="w-full h-6 text-xs py-1 px-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400/10"
                >
                  Complete Setup
                </Button>
              </div>
            ) : (
              <div>
                <p className={`text-xs font-medium ${getColorClass()}`}>
                  {statusMessage}
                </p>
                {userType === 'subscriber' && hasActiveSubscription && tierDisplay && (
                  <div className="flex items-center gap-1 mt-1">
                    <Crown className={`h-3 w-3 ${getTierColor(cachedTierInfo.tier || profile?.subscription_tier)}`} />
                    <p className={`text-xs ${getTierColor(cachedTierInfo.tier || profile?.subscription_tier)}`}>
                      {tierDisplay}
                    </p>
                  </div>
                )}
                {userType === 'trial' && daysRemaining <= 3 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Upgrade to keep access
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
