import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { supabase } from '@/integrations/supabase/client';
import { Settings, User, RefreshCw } from 'lucide-react';

const userStatusOptions = [
  { value: 'setup_incomplete', label: 'Setup Incomplete', description: 'New user who needs to complete setup' },
  { value: 'active_trial', label: 'Active Trial', description: 'User with active trial period' },
  { value: 'expired_trial', label: 'Expired Trial', description: 'User with expired trial' },
  { value: 'paid_subscriber', label: 'Paid Subscriber', description: 'User with active subscription' },
  { value: 'canceled_but_active', label: 'Canceled but Active', description: 'User who canceled but still has access' },
  { value: 'canceled_and_inactive', label: 'Canceled and Inactive', description: 'User who canceled and subscription has expired' },
];

export const UserStatusSwitcher = () => {
  const { profile, refetch } = useProfile();
  const { userStatus, invalidateCache } = useUserStatus();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async () => {
    if (!profile?.id || !selectedStatus) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('admin_set_user_status', {
          p_user_id: profile.id,
          p_status_type: selectedStatus
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Status Updated",
        description: `User status changed to ${selectedStatus}`,
        variant: "default",
      });

      // Force profile refresh first, then clear status cache
      await refetch();
      invalidateCache();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Only show in development or for specific users
  if (!profile || process.env.NODE_ENV === 'production') {
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
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Switch'
              )}
            </Button>
          </div>
        </div>

        <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
          <strong>Note:</strong> This developer tool allows you to test different user states. 
          Changes are immediate and will affect navigation and access control.
        </div>
      </CardContent>
    </Card>
  );
};