import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAdminControls } from '@/hooks/useAdminControls';
import { useSubscriptionTiers } from '@/hooks/useSubscriptionTiers';
import { SubscriptionTier } from '@/types/database';

interface UserSubscriptionManagerProps {
  userId?: string;
}

export const UserSubscriptionManager = ({ userId }: UserSubscriptionManagerProps) => {
  const [selectedUserId, setSelectedUserId] = useState(userId || '');
  const [userDetails, setUserDetails] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('');
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier | ''>('');
  const [trialDays, setTrialDays] = useState(30);
  
  const { updateUserSubscription, extendTrial, getUserSubscriptionDetails, isLoading } = useAdminControls();
  const { tiers } = useSubscriptionTiers();

  const handleGetUserDetails = async () => {
    if (!selectedUserId) return;
    
    try {
      const details = await getUserSubscriptionDetails(selectedUserId);
      setUserDetails(details);
    } catch (error) {
      console.error('Error getting user details:', error);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!selectedUserId) return;

    try {
      await updateUserSubscription(selectedUserId, {
        subscription_status: subscriptionStatus || undefined,
        subscription_tier: subscriptionTier || undefined,
      });
      
      // Refresh user details
      await handleGetUserDetails();
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  const handleExtendTrial = async () => {
    if (!selectedUserId) return;

    try {
      await extendTrial(selectedUserId, trialDays);
      // Refresh user details
      await handleGetUserDetails();
    } catch (error) {
      console.error('Error extending trial:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active_trial':
        return 'bg-green-100 text-green-800';
      case 'expired_trial':
        return 'bg-red-100 text-red-800';
      case 'subscriber':
        return 'bg-blue-100 text-blue-800';
      case 'canceled_active':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'starter':
        return 'bg-green-100 text-green-800';
      case 'professional':
        return 'bg-blue-100 text-blue-800';
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Subscription Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <div className="flex space-x-2">
              <Input
                id="userId"
                placeholder="Enter user ID"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              />
              <Button 
                onClick={handleGetUserDetails}
                disabled={!selectedUserId || isLoading}
              >
                Get Details
              </Button>
            </div>
          </div>

          {userDetails && (
            <div className="space-y-4">
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm">{userDetails.user.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Full Name</Label>
                  <p className="text-sm">{userDetails.user.full_name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Current Status</Label>
                  <Badge className={getStatusColor(userDetails.current_status)}>
                    {userDetails.current_status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Subscription Tier</Label>
                  {userDetails.user.subscription_tier ? (
                    <Badge className={getTierColor(userDetails.user.subscription_tier)}>
                      {userDetails.user.subscription_tier}
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-500">None</span>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Days Remaining</Label>
                  <p className="text-sm">{userDetails.days_remaining || 0}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Trial End Date</Label>
                  <p className="text-sm">
                    {userDetails.user.trial_end_date ? 
                      new Date(userDetails.user.trial_end_date).toLocaleDateString() : 
                      'N/A'
                    }
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Admin Controls</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subscription Status</Label>
                    <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Subscription Tier</Label>
                    <Select value={subscriptionTier} onValueChange={(value: SubscriptionTier | '') => setSubscriptionTier(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {tiers?.map((tier) => (
                          <SelectItem key={tier.tier_name} value={tier.tier_name}>
                            {tier.display_name} - ${tier.price_monthly}/month
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    onClick={handleUpdateSubscription}
                    disabled={isLoading || (!subscriptionStatus && !subscriptionTier)}
                  >
                    Update Subscription
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Extend Trial</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="Days"
                      value={trialDays}
                      onChange={(e) => setTrialDays(Number(e.target.value))}
                      className="w-20"
                    />
                    <Button 
                      onClick={handleExtendTrial}
                      disabled={isLoading}
                      variant="outline"
                    >
                      Extend Trial
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {tiers && (
        <Card>
          <CardHeader>
            <CardTitle>Available Subscription Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiers.map((tier) => (
                <div key={tier.tier_name} className="border rounded-lg p-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">{tier.display_name}</h4>
                    <p className="text-sm text-gray-600">{tier.description}</p>
                    <div className="text-sm">
                      <p>Price: ${tier.price_monthly}/month</p>
                      <p>Max Calendars: {tier.max_calendars}</p>
                      <p>Max Bookings: {tier.max_bookings_per_month}/month</p>
                      <p>Max Team Members: {tier.max_team_members}</p>
                      <p>API Access: {tier.api_access ? 'Yes' : 'No'}</p>
                      <p>White Label: {tier.white_label ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};