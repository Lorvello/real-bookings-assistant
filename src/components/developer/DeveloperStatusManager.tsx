import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useAdminControls } from '@/hooks/useAdminControls';
import { Settings, RefreshCw, Crown, User, AlertCircle } from 'lucide-react';

const userStatusOptions = [
  { 
    value: 'setup_incomplete', 
    label: 'Setup Incomplete',
    description: 'User has not completed business setup',
    tier: 'professional',
    tierRequired: true
  },
  { 
    value: 'active_trial', 
    label: 'Active Trial',
    description: 'User is in active trial period',
    tier: 'professional',
    tierRequired: true
  },
  { 
    value: 'expired_trial', 
    label: 'Expired Trial',
    description: 'Trial has ended, no active subscription',
    tier: null,
    tierRequired: false
  },
  { 
    value: 'paid_subscriber', 
    label: 'Paid Subscriber',
    description: 'Active paid subscription',
    tier: null,
    tierRequired: false
  },
  { 
    value: 'canceled_but_active', 
    label: 'Canceled but Active',
    description: 'Subscription canceled but still active',
    tier: null,
    tierRequired: false
  },
  { 
    value: 'canceled_and_inactive', 
    label: 'Canceled and Inactive',
    description: 'Subscription ended and inactive',
    tier: null,
    tierRequired: false
  }
];

const subscriptionTierOptions = [
  { 
    value: 'starter', 
    label: 'Starter',
    description: 'Basic features'
  },
  { 
    value: 'professional', 
    label: 'Professional',
    description: 'Advanced features'
  },
  { 
    value: 'enterprise', 
    label: 'Enterprise',
    description: 'All features'
  }
];

export const DeveloperStatusManager = () => {
  const { profile, refetch } = useProfile();
  const { userStatus, invalidateCache } = useUserStatus();
  const { updateUserSubscription, setupMockIncompleteUser, isLoading } = useAdminControls();
  const { toast } = useToast();
  const [selectedUserStatus, setSelectedUserStatus] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('');

  const getCurrentUserStatusOption = () => {
    return userStatusOptions.find(option => {
      switch (option.value) {
        case 'setup_incomplete':
          return userStatus.isSetupIncomplete;
        case 'active_trial':
          return userStatus.userType === 'trial' && userStatus.isTrialActive;
        case 'expired_trial':
          return userStatus.userType === 'expired_trial';
        case 'paid_subscriber':
          return userStatus.userType === 'subscriber';
        case 'canceled_but_active':
          return userStatus.userType === 'canceled_subscriber' && userStatus.hasFullAccess;
        case 'canceled_and_inactive':
          return userStatus.userType === 'canceled_and_inactive';
        default:
          return false;
      }
    });
  };

  const getCurrentTier = () => {
    return subscriptionTierOptions.find(option => option.value === profile?.subscription_tier);
  };

  const getSelectedUserStatusOption = () => {
    return userStatusOptions.find(option => option.value === selectedUserStatus);
  };

  const getSelectedTierOption = () => {
    return subscriptionTierOptions.find(option => option.value === selectedTier);
  };

  const getAvailableTiers = () => {
    const selectedOption = getSelectedUserStatusOption();
    if (!selectedOption) return [];
    
    if (selectedOption.tierRequired) {
      return subscriptionTierOptions.filter(tier => tier.value === selectedOption.tier);
    }
    
    if (selectedOption.value === 'expired_trial' || selectedOption.value === 'canceled_and_inactive') {
      return [];
    }
    
    return subscriptionTierOptions;
  };

  const mapStatusToDatabase = (statusValue: string, tierValue?: string) => {
    const updates: any = {};
    
    switch (statusValue) {
      case 'setup_incomplete':
        // For setup incomplete: clear business data but keep subscription settings  
        updates.subscription_status = 'trial';
        updates.subscription_tier = 'professional';
        updates.trial_end_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        updates.subscription_end_date = null;
        updates.business_name = null; // Clear to trigger setup_incomplete detection
        updates.business_type = null; // Clear to trigger setup_incomplete detection
        break;
      case 'active_trial':
        // For active trial: complete business data with trial settings
        updates.subscription_status = 'trial';
        updates.subscription_tier = 'professional';
        updates.trial_end_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        updates.subscription_end_date = null;
        updates.business_name = 'Demo Business';
        updates.business_type = 'salon';
        break;
      case 'expired_trial':
        // For expired trial: no active subscription
        updates.subscription_status = 'expired';
        updates.subscription_tier = null;
        updates.trial_end_date = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        updates.subscription_end_date = null;
        updates.business_name = 'Demo Business';
        updates.business_type = 'salon';
        break;
      case 'paid_subscriber':
        updates.subscription_status = 'active';
        updates.subscription_tier = tierValue || 'professional';
        updates.trial_end_date = null;
        updates.subscription_end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        updates.business_name = 'Professional Business';
        updates.business_type = 'clinic';
        break;
      case 'canceled_but_active':
        updates.subscription_status = 'canceled';
        updates.subscription_tier = tierValue || 'professional';
        updates.trial_end_date = null;
        updates.subscription_end_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        updates.business_name = 'Professional Business';
        updates.business_type = 'clinic';
        break;
      case 'canceled_and_inactive':
        updates.subscription_status = 'expired';
        updates.subscription_tier = null;
        updates.trial_end_date = null;
        updates.subscription_end_date = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        updates.business_name = 'Demo Business';
        updates.business_type = 'salon';
        break;
    }
    
    return updates;
  };

  const handleApplyChanges = async () => {
    if (!profile?.id || !selectedUserStatus) return;

    const selectedStatusOption = getSelectedUserStatusOption();
    if (!selectedStatusOption) return;

    const effectiveTier = selectedStatusOption.tierRequired 
      ? selectedStatusOption.tier 
      : selectedTier || 'professional';

    try {
      console.log('Updating user status to:', selectedUserStatus, 'with tier:', effectiveTier);
      
      // For setup_incomplete, use the special function that clears all data
      if (selectedUserStatus === 'setup_incomplete') {
        await setupMockIncompleteUser(profile.id);
      } else {
        // For other statuses, use normal update
        const updates = mapStatusToDatabase(selectedUserStatus, effectiveTier);
        await updateUserSubscription(profile.id, updates);
      }

      toast({
        title: "Status Updated Successfully",
        description: `User status changed to ${selectedStatusOption.label}${effectiveTier ? ` with ${effectiveTier} tier` : ''}`,
        variant: "default",
      });

      // Force complete refresh
      console.log('Refreshing profile and clearing cache...');
      await refetch();
      invalidateCache();
      
      // Reload page as fallback
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
      // Clear selections
      setSelectedUserStatus('');
      setSelectedTier('');
      
      console.log('Status update completed successfully');
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  // Only show if profile exists
  if (!profile) {
    return null;
  }

  const currentStatus = getCurrentUserStatusOption();
  const currentTier = getCurrentTier();
  const availableTiers = getAvailableTiers();
  const selectedStatusOption = getSelectedUserStatusOption();

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-800">
          <Settings className="h-5 w-5" />
          Developer: Status Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status Display */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-purple-700">Current Status:</span>
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
              {currentStatus ? currentStatus.label : 'Unknown'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-purple-700">Current Tier:</span>
            <Badge variant={currentTier ? 'default' : 'secondary'} className="bg-purple-100 text-purple-800">
              {currentTier ? currentTier.label : 'No Active Subscription'}
            </Badge>
          </div>
        </div>

        {/* User Status Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-purple-700">Select User Status:</label>
          <Select value={selectedUserStatus} onValueChange={setSelectedUserStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Choose user status to test" />
            </SelectTrigger>
            <SelectContent>
              {userStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subscription Tier Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-purple-700">Subscription Tier:</label>
          {selectedStatusOption?.tierRequired ? (
            <div className="flex items-center gap-2 p-2 bg-purple-100 rounded border">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-purple-700">
                Automatically set to <strong>{selectedStatusOption.tier}</strong> for this status
              </span>
            </div>
          ) : availableTiers.length === 0 ? (
            <div className="flex items-center gap-2 p-2 bg-gray-100 rounded border">
              <AlertCircle className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">
                No subscription tier for this status
              </span>
            </div>
          ) : (
            <Select 
              value={selectedTier} 
              onValueChange={setSelectedTier}
              disabled={!selectedUserStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose subscription tier" />
              </SelectTrigger>
              <SelectContent>
                {availableTiers.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Apply Button */}
        <Button 
          onClick={handleApplyChanges}
          disabled={!selectedUserStatus || isLoading}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Settings className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Applying Changes...' : 'Apply Changes'}
        </Button>

        <div className="space-y-2">
          <div className="text-xs text-purple-600 bg-purple-100 dark:bg-purple-950 dark:text-purple-300 p-2 rounded">
            <strong>Developer Tool:</strong> Test different user statuses and subscription tiers. Some combinations automatically determine the tier.
          </div>
          <div className="text-xs text-blue-600 bg-blue-100 dark:bg-blue-950 dark:text-blue-300 p-2 rounded">
            💡 <strong>Mock Data:</strong> All status changes show mock data (calendars, bookings, business info) to prevent crashes and enable full feature testing.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};