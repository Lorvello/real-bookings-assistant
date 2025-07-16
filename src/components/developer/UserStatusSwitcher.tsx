import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { supabase } from '@/integrations/supabase/client';
import { Settings, User, RefreshCw, AlertTriangle, Database } from 'lucide-react';

const userStatusOptions = [
  { 
    value: 'setup_incomplete', 
    label: 'Setup Incomplete', 
    description: 'Fresh account - all data will be cleared',
    dataAction: 'clear',
    warning: 'This will delete all calendars, services, bookings, and business info!'
  },
  { 
    value: 'active_trial', 
    label: 'Active Trial', 
    description: 'Basic setup with demo data',
    dataAction: 'generate_basic',
    warning: 'This will clear existing data and generate basic demo setup'
  },
  { 
    value: 'expired_trial', 
    label: 'Expired Trial', 
    description: 'Keeps existing data unchanged',
    dataAction: 'preserve',
    warning: 'No data changes - preserves current setup'
  },
  { 
    value: 'paid_subscriber', 
    label: 'Paid Subscriber', 
    description: 'Full setup with comprehensive data',
    dataAction: 'generate_full',
    warning: 'This will clear existing data and generate full professional setup'
  },
  { 
    value: 'canceled_but_active', 
    label: 'Canceled but Active', 
    description: 'Keeps existing data unchanged',
    dataAction: 'preserve',
    warning: 'No data changes - preserves current setup'
  },
  { 
    value: 'canceled_and_inactive', 
    label: 'Canceled and Inactive', 
    description: 'Keeps existing data unchanged',
    dataAction: 'preserve',
    warning: 'No data changes - preserves current setup'
  },
];

export const UserStatusSwitcher = () => {
  const { profile, refetch } = useProfile();
  const { userStatus, invalidateCache } = useUserStatus();
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
      
      // Determine if we need to clear data and generate mock data
      const shouldClearData = selectedOption.dataAction === 'clear' || 
                              selectedOption.dataAction === 'generate_basic' || 
                              selectedOption.dataAction === 'generate_full';
      
      const shouldGenerateMockData = selectedOption.dataAction === 'generate_basic' || 
                                     selectedOption.dataAction === 'generate_full';

      // Phase 1: Clear existing data if needed
      if (shouldClearData) {
        setLoadingPhase('Clearing existing data...');
        console.log('Clearing existing data for fresh start');
      }

      // Phase 2: Generate mock data if needed
      if (shouldGenerateMockData) {
        setLoadingPhase('Generating mock data...');
        console.log('Generating mock data for status:', selectedStatus);
      }

      // Phase 3: Update status
      setLoadingPhase('Updating user status...');
      
      const { data, error } = await supabase
        .rpc('admin_set_user_status', {
          p_user_id: profile.id,
          p_status: selectedStatus,
          p_clear_data: shouldClearData,
          p_generate_mock_data: shouldGenerateMockData
        });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      console.log('RPC response:', data);

      // Check if the function returned success
      const response = data as { 
        success?: boolean; 
        error?: string; 
        message?: string;
        data_cleared?: boolean;
        mock_data_generated?: boolean;
        clear_result?: any;
        mock_result?: any;
      };
      
      if (response && !response.success) {
        throw new Error(response.error || 'Failed to update user status');
      }

      // Phase 4: Refresh contexts and cache
      setLoadingPhase('Refreshing data...');
      
      toast({
        title: "Status Updated Successfully",
        description: `User status changed to ${selectedOption.label}. ${
          response.data_cleared ? 'Data cleared. ' : ''
        }${
          response.mock_data_generated ? 'Mock data generated. ' : ''
        }`,
        variant: "default",
      });

      // Force profile refresh first, then update status cache with new status
      console.log('Refreshing profile and updating cache with new status...');
      await refetch();
      invalidateCache(selectedStatus);
      
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

          {/* Warning Message */}
          {selectedStatus && !isLoading && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-amber-800">
                    Warning: {getSelectedOption()?.label}
                  </div>
                  <div className="text-xs text-amber-700 mt-1">
                    {getSelectedOption()?.warning}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
          <strong>Note:</strong> This developer tool simulates different user states with realistic data. 
          Mock data generation helps test various scenarios without manual setup.
        </div>
      </CardContent>
    </Card>
  );
};