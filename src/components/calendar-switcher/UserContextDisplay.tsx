
import React from 'react';
import { User, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

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

const getTierBadgeVariant = (tier?: string) => {
  switch (tier) {
    case 'starter':
      return 'secondary';
    case 'professional':
      return 'default';
    case 'enterprise':
      return 'default';
    default:
      return 'outline';
  }
};

const getTierColor = (tier?: string) => {
  switch (tier) {
    case 'starter':
      return 'text-gray-600';
    case 'professional':
      return 'text-blue-600';
    case 'enterprise':
      return 'text-yellow-600';
    default:
      return 'text-gray-500';
  }
};

export function UserContextDisplay() {
  const { user } = useAuth();
  const { profile } = useProfile();

  const tierDisplay = formatSubscriptionTier(profile?.subscription_tier);
  const hasActiveSubscription = profile?.subscription_status === 'active';

  return (
    <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 rounded-lg border">
      <User className="h-4 w-4 text-muted-foreground" />
      <div className="text-sm flex-1">
        <div className="font-medium text-foreground">
          {profile?.business_name || profile?.full_name || user?.email}
        </div>
        {profile?.business_name && (
          <div className="text-xs text-muted-foreground">
            {profile?.full_name}
          </div>
        )}
        {hasActiveSubscription && tierDisplay && (
          <div className="flex items-center gap-1 mt-1">
            <Crown className={`h-3 w-3 ${getTierColor(profile?.subscription_tier)}`} />
            <Badge variant={getTierBadgeVariant(profile?.subscription_tier)} className="text-xs px-1 py-0">
              {tierDisplay}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
