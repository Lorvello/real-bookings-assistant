import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AccountRequirementsProps {
  accountId?: string;
  calendarId?: string;
}

interface Requirement {
  field: string;
  description: string;
  priority: 'high' | 'medium';
  deadline?: string | null;
}

interface AccountRequirementsData {
  accountStatus: {
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    isRestricted: boolean;
    restrictionReason?: string;
  };
  requirements: {
    currentlyDue: Requirement[];
    eventuallyDue: Requirement[];
    pastDue: string[];
    currentDeadline?: string | null;
  };
  lastUpdated: string;
}

export const AccountRequirements: React.FC<AccountRequirementsProps> = ({
  accountId,
  calendarId
}) => {
  const { toast } = useToast();

  const { data: requirementsData, isLoading, refetch } = useQuery({
    queryKey: ['account-requirements', accountId, calendarId],
    queryFn: async () => {
      if (!accountId) return null;

      const { data, error } = await supabase.functions.invoke('get-account-requirements', {
        body: {
          calendar_id: calendarId,
          test_mode: true
        }
      });

      if (error) throw error;
      return data as AccountRequirementsData;
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Account requirements have been updated"
    });
  };

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? (
      <CheckCircle className="w-4 h-4 text-success" />
    ) : (
      <XCircle className="w-4 h-4 text-destructive" />
    );
  };

  const getPriorityIcon = (priority: string) => {
    return priority === 'high' ? (
      <AlertCircle className="w-4 h-4 text-destructive" />
    ) : (
      <Clock className="w-4 h-4 text-warning" />
    );
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'high' ? 'destructive' : 'warning';
  };

  if (!accountId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Connect your Stripe account to view requirements</p>
        </CardContent>
      </Card>
    );
  }

  const accountStatus = requirementsData?.accountStatus;
  const requirements = requirementsData?.requirements;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="w-5 h-5 text-primary" />
              Account Verification
            </CardTitle>
            <CardDescription>
              Complete these requirements to ensure full account functionality
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : accountStatus ? (
          <div className="space-y-6">
            {/* Account Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
                {getStatusIcon(accountStatus.chargesEnabled)}
                <div>
                  <p className="font-medium">Charges</p>
                  <p className="text-sm text-muted-foreground">
                    {accountStatus.chargesEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
                {getStatusIcon(accountStatus.payoutsEnabled)}
                <div>
                  <p className="font-medium">Payouts</p>
                  <p className="text-sm text-muted-foreground">
                    {accountStatus.payoutsEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
                {getStatusIcon(accountStatus.detailsSubmitted)}
                <div>
                  <p className="font-medium">Details</p>
                  <p className="text-sm text-muted-foreground">
                    {accountStatus.detailsSubmitted ? 'Submitted' : 'Incomplete'}
                  </p>
                </div>
              </div>
            </div>

            {/* Restriction Warning */}
            {accountStatus.isRestricted && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <h3 className="font-medium text-destructive">Account Restricted</h3>
                </div>
                <p className="text-sm">
                  {accountStatus.restrictionReason || 'Your account has restrictions that need to be resolved.'}
                </p>
              </div>
            )}

            {/* Requirements Deadline */}
            {requirements?.currentDeadline && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-warning" />
                  <h3 className="font-medium text-warning">Action Required</h3>
                </div>
                <p className="text-sm">
                  Please complete the requirements below by {new Date(requirements.currentDeadline).toLocaleDateString('nl-NL')}
                </p>
              </div>
            )}

            {/* Currently Due Requirements */}
            {requirements?.currentlyDue && requirements.currentlyDue.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  Immediate Action Required
                </h3>
                <div className="space-y-3">
                  {requirements.currentlyDue.map((requirement, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 bg-card rounded-lg border border-destructive/20"
                    >
                      {getPriorityIcon(requirement.priority)}
                      <div className="flex-1">
                        <p className="font-medium">{requirement.description}</p>
                        <p className="text-sm text-muted-foreground">
                          Field: {requirement.field}
                          {requirement.deadline && (
                            <span> • Due: {new Date(requirement.deadline).toLocaleDateString('nl-NL')}</span>
                          )}
                        </p>
                      </div>
                      <Badge variant={getPriorityColor(requirement.priority) as any}>
                        {requirement.priority === 'high' ? 'Urgent' : 'Required'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Eventually Due Requirements */}
            {requirements?.eventuallyDue && requirements.eventuallyDue.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" />
                  Future Requirements
                </h3>
                <div className="space-y-3">
                  {requirements.eventuallyDue.map((requirement, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 bg-card rounded-lg border"
                    >
                      {getPriorityIcon(requirement.priority)}
                      <div className="flex-1">
                        <p className="font-medium">{requirement.description}</p>
                        <p className="text-sm text-muted-foreground">
                          Field: {requirement.field}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        Future
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Requirements Complete */}
            {(!requirements?.currentlyDue || requirements.currentlyDue.length === 0) &&
             (!requirements?.eventuallyDue || requirements.eventuallyDue.length === 0) && (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                <p className="font-medium text-success">All Requirements Complete!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your account is fully verified and ready for use
                </p>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground text-center">
                Last updated: {new Date(requirementsData?.lastUpdated || '').toLocaleString('nl-NL')}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Unable to load account requirements</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};