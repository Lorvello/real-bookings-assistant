
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

  // Initialize cache from localStorage (same as useProfile does)
  const [cachedTierInfo, setCachedTierInfo] = useState<{
    tier: string | null;
    isActive: boolean;
  }>(() => {
    // Try to get cached profile data from localStorage to initialize with
    try {
      const cached = localStorage.getItem('userProfile');
      if (cached) {
        const { data } = JSON.parse(cached);
        if (data?.subscription_tier && data?.subscription_status === 'active') {
          return {
            tier: data.subscription_tier,
            isActive: true
          };
        }
      }
    } catch (error) {
      console.error('Error loading cached profile for StatusIndicator:', error);
    }
    return { tier: null, isActive: false };
  });

  // Only update cache when we get valid new subscription data
  useEffect(() => {
    // Update if we have any subscription tier data (not just active subscriptions)
    if (profile?.subscription_tier) {
      setCachedTierInfo(prev => {
        // Only update if the data actually changed
        if (prev.tier !== profile.subscription_tier || prev.isActive !== (profile?.subscription_status === 'active')) {
          return {
            tier: profile.subscription_tier,
            isActive: profile?.subscription_status === 'active'
          };
        }
        return prev;
      });
    }
    // IMPORTANT: Don't clear cache when profile becomes null during navigation
    // Only clear if user actually logs out (which would be handled by parent components)
  }, [profile?.subscription_tier, profile?.subscription_status]);

  // Always prefer current profile data if available, fallback to cached data
  const currentTier = profile?.subscription_tier || cachedTierInfo.tier;
  const tierDisplay = formatSubscriptionTier(currentTier);
  const hasActiveSubscription = profile?.subscription_status === 'active' || cachedTierInfo.isActive;

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
                {currentTier && tierDisplay && (
                  <div className="flex items-center gap-1">
                    <Crown className={`h-3 w-3 ${getTierColor(currentTier)}`} />
                    <p className={`text-xs ${getTierColor(currentTier)}`}>
                      {tierDisplay}
                    </p>
                  </div>
                )}
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
                {/* Always show subscription tier if available */}
                {currentTier && tierDisplay && (
                  <div className="flex items-center gap-1 mt-1">
                    <Crown className={`h-3 w-3 ${getTierColor(currentTier)}`} />
                    <p className={`text-xs ${getTierColor(currentTier)}`}>
                      {tierDisplay}
                    </p>
                  </div>
                )}
                {/* Show additional info based on user type */}
                {userType === 'trial' && daysRemaining <= 3 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Upgrade to keep access
                  </p>
                )}
                {userType === 'canceled_subscriber' && (
                  <p className="text-xs text-gray-400 mt-1">
                    Access will end soon
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
