import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertTriangle, Shield, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaxStatusOverviewProps {
  accountId?: string;
  calendarId?: string;
}

export const TaxStatusOverview: React.FC<TaxStatusOverviewProps> = ({ 
  accountId, 
  calendarId 
}) => {
  const { toast } = useToast();

  const { data: taxData, isLoading, refetch } = useQuery({
    queryKey: ['tax-status-overview', accountId, calendarId],
    queryFn: async () => {
      if (!accountId) return null;

      const { data, error } = await supabase.functions.invoke('get-tax-data', {
        body: {
          calendar_id: calendarId,
          test_mode: true
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Tax status has been updated"
    });
  };

  if (!accountId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">Setup Required</h3>
          <p className="text-muted-foreground">Complete Stripe onboarding to enable tax collection</p>
        </CardContent>
      </Card>
    );
  }

  const stripeStatus = taxData?.stripeAccountStatus;
  const overview = taxData?.overview;
  
  const getConnectionStatus = () => {
    if (!stripeStatus) return { icon: AlertTriangle, text: 'Unknown', color: 'bg-muted' };
    
    if (stripeStatus.chargesEnabled && stripeStatus.automaticTaxEnabled) {
      return { 
        icon: CheckCircle, 
        text: 'Tax collection active', 
        color: 'bg-primary text-primary-foreground' 
      };
    }
    
    return { 
      icon: AlertTriangle, 
      text: 'Setup required', 
      color: 'bg-warning text-warning-foreground' 
    };
  };

  const getComplianceStatus = () => {
    if (!overview) return { icon: AlertTriangle, text: 'Unknown', color: 'bg-muted' };
    
    switch (overview.complianceStatus) {
      case 'compliant':
        return { icon: CheckCircle, text: 'Fully compliant', color: 'bg-primary text-primary-foreground' };
      case 'warning':
        return { icon: AlertTriangle, text: 'Minor issues', color: 'bg-warning text-warning-foreground' };
      case 'non_compliant':
        return { icon: AlertTriangle, text: 'Needs attention', color: 'bg-destructive text-destructive-foreground' };
      default:
        return { icon: AlertTriangle, text: 'Unknown', color: 'bg-muted' };
    }
  };

  const connectionStatus = getConnectionStatus();
  const complianceStatus = getComplianceStatus();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5 text-primary" />
              Status Overview
            </CardTitle>
            <CardDescription>
              Current tax collection and compliance status
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-20 bg-muted rounded-lg animate-pulse" />
            <div className="h-20 bg-muted rounded-lg animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
              <div className="flex-shrink-0">
                <connectionStatus.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Connection Status</h3>
                <Badge variant="secondary" className={connectionStatus.color}>
                  {connectionStatus.text}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
              <div className="flex-shrink-0">
                <complianceStatus.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Compliance Status</h3>
                <Badge variant="secondary" className={complianceStatus.color}>
                  {complianceStatus.text}
                </Badge>
              </div>
            </div>
          </div>
        )}
        
        {taxData && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Account: {stripeStatus?.country || 'NL'} • Express</span>
              </div>
              <div>
                Last updated: {new Date(taxData.lastUpdated).toLocaleString('nl-NL')}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};