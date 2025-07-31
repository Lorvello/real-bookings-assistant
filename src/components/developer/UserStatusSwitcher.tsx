import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useAdminControls } from '@/hooks/useAdminControls';
import { Settings, User, RefreshCw, Database } from 'lucide-react';
import { SubscriptionTier } from '@/types/database';

const userStatusOptions = [
  { 
    value: 'setup_incomplete', 
    label: 'Setup Incomplete', 
    description: 'Brand new account with empty setup',
    dataAction: 'clear'
  },
  { 
    value: 'active_trial', 
    label: 'Active Trial', 
    description: 'Demo salon with basic setup complete',
    dataAction: 'generate_basic'
  },
  { 
    value: 'expired_trial', 
    label: 'Expired Trial', 
    description: 'Demo salon with trial period expired',
    dataAction: 'generate_basic'
  },
  { 
    value: 'paid_subscriber', 
    label: 'Paid Subscriber', 
    description: 'Professional clinic with full setup',
    dataAction: 'generate_full'
  },
  { 
    value: 'canceled_but_active', 
    label: 'Canceled but Active', 
    description: 'Professional clinic, canceled but still active',
    dataAction: 'generate_full'
  },
  { 
    value: 'canceled_and_inactive', 
    label: 'Canceled and Inactive', 
    description: 'Professional clinic, canceled and inactive',
    dataAction: 'generate_full'
  },
];

export const UserStatusSwitcher = () => {
  const { profile, refetch } = useProfile();
  const { userStatus, invalidateCache } = useUserStatus();
  const { updateUserSubscription } = useAdminControls();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');

  const getSelectedOption = () => {
    return userStatusOptions.find(option => option.value === selectedStatus);
  };

  const handleStatusChange = async () => {
    if (!profile?.id || !selectedStatus) return;

    const selectedOption = getSelectedOption();
    if (!selectedOption) return;

    setIsLoading(true);
    try {
      console.log('Updating user status to:', selectedStatus);
      
      // Map UI status to database values (like SubscriptionTierSwitcher approach)
      let subscriptionStatus: string;
      let subscriptionTier: SubscriptionTier | null;
      let trialEndDate: string | undefined;
      let subscriptionEndDate: string | undefined;

      switch (selectedStatus) {
        case 'setup_incomplete':
          subscriptionStatus = 'trial';
          subscriptionTier = null;
          trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          subscriptionEndDate = undefined;
          break;
        case 'active_trial':
          subscriptionStatus = 'trial';
          subscriptionTier = null;
          trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          subscriptionEndDate = undefined;
          break;
        case 'expired_trial':
          subscriptionStatus = 'expired';
          subscriptionTier = null;
          trialEndDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          subscriptionEndDate = undefined;
          break;
        case 'paid_subscriber':
          subscriptionStatus = 'active';
          subscriptionTier = 'professional';
          trialEndDate = undefined;
          subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'canceled_but_active':
          subscriptionStatus = 'canceled';
          subscriptionTier = 'professional';
          trialEndDate = undefined;
          subscriptionEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'canceled_and_inactive':
          subscriptionStatus = 'expired';
          subscriptionTier = null;
          trialEndDate = undefined;
          subscriptionEndDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          throw new Error(`Invalid status: ${selectedStatus}`);
      }

      // Phase 1: Update database directly (reliable approach like SubscriptionTierSwitcher)
      setLoadingPhase('Updating user status...');
      
      await updateUserSubscription(profile.id, {
        subscription_status: subscriptionStatus,
        subscription_tier: subscriptionTier,
        trial_end_date: trialEndDate,
        subscription_end_date: subscriptionEndDate,
      });

      // Phase 2: Clear caches and force refresh
      setLoadingPhase('Refreshing data...');
      
      // Clear all caches
      sessionStorage.removeItem('globalUserStatusCache');
      sessionStorage.removeItem('userProfile');
      localStorage.removeItem('userProfile');
      
      // Force profile refresh and invalidate status cache
      await refetch();
      invalidateCache(selectedStatus);
      
      // As final fallback, reload the page to ensure all contexts get fresh data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      toast({
        title: "Status Updated Successfully",
        description: `User status changed to ${selectedOption.label}. Page will refresh to show changes.`,
        variant: "default",
      });

      // Clear the selected status
      setSelectedStatus('');
      
      console.log('User status update completed successfully');
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingPhase('');
    }
  };

  // Only show if profile exists (admin can access in any environment)
  if (!profile) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Settings className="h-5 w-5" />
          Developer: User Status Switcher
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-700">Current Status:</span>
          <Badge variant={userStatus.statusColor === 'green' ? 'default' : 'secondary'}>
            {userStatus.statusMessage}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select status to test" />
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
            
            <Button 
              onClick={handleStatusChange}
              disabled={!selectedStatus || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Processing...' : 'Switch'}
            </Button>
          </div>

          {/* Loading Phase Indicator */}
          {isLoading && loadingPhase && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>{loadingPhase}</span>
            </div>
          )}

        </div>

        <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
          <strong>Developer Tool:</strong> Instantly switch between different user states with appropriate mock data.
        </div>
      </CardContent>
    </Card>
  );
};