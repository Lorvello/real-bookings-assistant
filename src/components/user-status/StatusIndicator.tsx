
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Clock, AlertTriangle, CheckCircle, XCircle, Zap, Crown } from 'lucide-react';
import { UserStatus } from '@/types/userStatus';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useProfile } from '@/hooks/useProfile';

interface StatusIndicatorProps {
  userStatus: UserStatus;
  isExpanded: boolean;
  tooltipsDisabled?: boolean;
}

const formatSubscriptionTier = (tier: string | undefined, t: TFunction) => {
  if (!tier) return null;

  switch (tier) {
    case 'free':
      return t('app.status.planFree', 'Free Plan');
    case 'starter':
      return t('app.status.planStarter', 'Starter Plan');
    case 'professional':
      return t('app.status.planProfessional', 'Professional Plan');
    case 'enterprise':
      return t('app.status.planEnterprise', 'Enterprise Plan');
    default:
      // Never silently blank on a real (e.g. newly-added) tier: the goal is that
      // the indicator ALWAYS shows the real plan. Title-case the raw value instead.
      return t('app.status.planSuffix', '{{tier}} Plan', { tier: `${tier.charAt(0).toUpperCase()}${tier.slice(1)}` });
  }
};

const getTierColor = (tier?: string) => {
  switch (tier) {
    case 'starter':
      return 'text-success-foreground';
    case 'professional':
      return 'text-accent-foreground';
    case 'enterprise':
      return 'text-warning-foreground';
    default:
      return 'text-subtle-foreground';
  }
};

export function StatusIndicator({ userStatus, isExpanded, tooltipsDisabled = false }: StatusIndicatorProps) {
  const { userType, statusMessage, statusColor, daysRemaining } = userStatus;
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { t } = useTranslation('app');

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
  const tierDisplay = formatSubscriptionTier(currentTier, t);
  const hasActiveSubscription = profile?.subscription_status === 'active' || cachedTierInfo.isActive;

  const getIcon = () => {
    switch (userType) {
      case 'trial':
        return <Zap className={`h-4 w-4 ${getColorClass()}`} />;
      case 'expired_trial':
        return <XCircle className={`h-4 w-4 ${getColorClass()}`} />;
      case 'missed_payment':
        return <XCircle className={`h-4 w-4 ${getColorClass()}`} />;
      case 'subscriber':
        return <CheckCircle className={`h-4 w-4 ${getColorClass()}`} />;
      case 'canceled_subscriber':
        return <AlertTriangle className={`h-4 w-4 ${getColorClass()}`} />;
      case 'canceled_and_inactive':
        return <XCircle className={`h-4 w-4 ${getColorClass()}`} />;
      case 'setup_incomplete':
        return <Clock className={`h-4 w-4 ${getColorClass()}`} />;
      default:
        return <Clock className={`h-4 w-4 ${getColorClass()}`} />;
    }
  };

  const getColorClass = () => {
    switch (statusColor) {
      case 'green':
        return 'text-success-foreground';
      case 'yellow':
        return 'text-warning-foreground';
      case 'red':
        return 'text-destructive-foreground';
      default:
        return 'text-subtle-foreground';
    }
  };

  const getBgColor = () => {
    switch (statusColor) {
      case 'green':
        return 'bg-success/10 border-success/30';
      case 'yellow':
        return 'bg-warning/10 border-warning/30';
      case 'red':
        return 'bg-destructive/10 border-destructive/30';
      default:
        return 'bg-white/[0.05] border-white/[0.08]';
    }
  };

  const getTooltipText = () => {
    let text = statusMessage;
    if (currentTier && tierDisplay) {
      text += ` - ${tierDisplay}`;
    }
    if (userType === 'trial' || userType === 'setup_incomplete') {
      text += ` (${daysRemaining} days remaining)`;
    }
    return text;
  };

  const getCompactDisplay = () => {
    if (userType === 'trial' || userType === 'setup_incomplete') {
      return `${daysRemaining}d`;
    }
    return '';
  };

  return (
    <div className={`mb-2 ${isExpanded ? `px-3 py-2 rounded-lg border ${getBgColor()}` : 'w-12 h-12 flex flex-col items-center justify-center rounded-lg border mx-2'} ${getBgColor()}`}>
      {isExpanded ? (
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 min-w-0 flex-1">
            {userType === 'setup_incomplete' ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-warning-foreground">
                  {daysRemaining === 1
                    ? t('app.status.trialDaysOne', '{{count}} Day Free Trial Remaining', { count: daysRemaining })
                    : t('app.status.trialDaysOther', '{{count}} Days Free Trial Remaining', { count: daysRemaining })}
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
                  className="w-full h-6 text-xs py-1 px-2 border-warning/40 text-warning-foreground hover:bg-warning/10"
                >
                  {t('app.status.completeSetup', 'Complete Setup')}
                </Button>
              </div>
            ) : (
              <div>
                <p className={`text-xs font-medium ${getColorClass()}`}>
                  {statusMessage}
                </p>
                {/* Show subscription tier only for active/canceled_subscriber users */}
                {currentTier && tierDisplay && (userType === 'subscriber' || userType === 'canceled_subscriber') && (
                  <div className="flex items-center gap-1 mt-1">
                    <Crown className={`h-3 w-3 ${getTierColor(currentTier)}`} />
                    <p className={`text-xs ${getTierColor(currentTier)}`}>
                      {tierDisplay}
                    </p>
                  </div>
                )}
                {/* Show additional info based on user type */}
                {userType === 'trial' && daysRemaining <= 3 && (
                  <p className="text-xs text-subtle-foreground mt-1">
                    {t('app.status.upgradeKeepAccess', 'Upgrade to keep access')}
                  </p>
                )}
                {userType === 'canceled_subscriber' && (
                  <p className="text-xs text-subtle-foreground mt-1">
                    {t('app.status.accessEndsSoon', 'Access will end soon')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <div className="flex-shrink-0">
            {React.cloneElement(getIcon() as React.ReactElement, { className: `h-4 w-4 ${getColorClass()}` })}
          </div>
          {getCompactDisplay() && (
            <span className={`text-[8px] font-medium ${getColorClass()}`}>
              {getCompactDisplay()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
