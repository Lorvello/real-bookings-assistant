
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useAdminControls } from '@/hooks/useAdminControls';
import { Crown, RefreshCw, Zap } from 'lucide-react';

const subscriptionTierOptions = [
  { 
    value: 'starter', 
    label: 'Starter Plan', 
    description: 'Basic features, 1 calendar, limited bookings',
    icon: Zap
  },
  { 
    value: 'professional', 
    label: 'Professional Plan', 
    description: 'Advanced features, API access, Future Insights',
    icon: Crown
  },
  { 
    value: 'enterprise', 
    label: 'Enterprise Plan', 
    description: 'All features, white-label, unlimited everything',
    icon: Crown
  },
];

export const SubscriptionTierSwitcher = () => {
  const { profile, refetch } = useProfile();
  const { invalidateCache } = useUserStatus();
  const { updateUserSubscription, isLoading } = useAdminControls();
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<string>('');

  const getCurrentTier = () => {
    return subscriptionTierOptions.find(option => option.value === profile?.subscription_tier);
  };

  const getSelectedOption = () => {
    return subscriptionTierOptions.find(option => option.value === selectedTier);
  };

  const handleTierChange = async () => {
    if (!profile?.id || !selectedTier) return;

    const selectedOption = getSelectedOption();
    if (!selectedOption) return;

    try {
      console.log('Updating subscription tier to:', selectedTier);
      
      await updateUserSubscription(profile.id, {
        subscription_status: 'active',
        subscription_tier: selectedTier as any,
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      });

      toast({
        title: "Subscription Tier Updated Successfully",
        description: `Subscription tier changed to ${selectedOption.label}`,
        variant: "default",
      });

      // Force profile refresh and update cache
      console.log('Refreshing profile and updating cache...');
      await refetch();
      invalidateCache('paid_subscriber'); // Force refresh of status context
      
      // Clear the selected tier
      setSelectedTier('');
      
      console.log('Subscription tier update completed successfully');
    } catch (error) {
      console.error('Error updating subscription tier:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update subscription tier",
        variant: "destructive",
      });
    }
  };

  // Only show if profile exists
  if (!profile) {
    return null;
  }

  const currentTier = getCurrentTier();

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Crown className="h-5 w-5" />
          Developer: Subscription Tier Switcher
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-600" />
          <span className="text-sm text-orange-700">Current Tier:</span>
          <Badge variant={currentTier ? 'default' : 'secondary'} className="bg-orange-100 text-orange-800">
            {currentTier ? currentTier.label : 'No Active Subscription'}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select tier to test" />
              </SelectTrigger>
              <SelectContent>
                {subscriptionTierOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleTierChange}
              disabled={!selectedTier || isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Crown className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Switching...' : 'Switch'}
            </Button>
          </div>
        </div>

        <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
          <strong>Developer Tool:</strong> Switch between subscription tiers to test tier-specific features like Future Insights.
        </div>
      </CardContent>
    </Card>
  );
};
