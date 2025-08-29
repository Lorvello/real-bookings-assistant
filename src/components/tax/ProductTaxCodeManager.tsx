import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Tag, Check, X, ArrowRightLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProductTaxCodeManagerProps {
  accountId?: string;
  calendarId?: string;
}

interface ServiceType {
  id: string;
  name: string;
  tax_code?: string;
  stripe_test_price_id?: string;
  stripe_live_price_id?: string;
}

interface TaxCode {
  id: string;
  name: string;
  description: string;
}

// Common tax codes for service businesses
const COMMON_TAX_CODES = [
  { id: 'txcd_10000000', name: 'General services', description: 'General services' },
  { id: 'txcd_10301000', name: 'Professional services', description: 'Professional, scientific, and technical services' },
  { id: 'txcd_10401010', name: 'Beauty services', description: 'Beauty and barber services' },
  { id: 'txcd_10401020', name: 'Health services', description: 'Health and wellness services' },
  { id: 'txcd_10501000', name: 'Educational services', description: 'Educational services' },
  { id: 'txcd_10502000', name: 'Training services', description: 'Training and coaching services' },
  { id: 'txcd_10401000', name: 'Personal care services', description: 'Personal care services' },
  { id: 'txcd_10302000', name: 'Consulting services', description: 'Management and consulting services' },
  { id: 'txcd_20030000', name: 'Digital services', description: 'Digital services and software' },
];

export const ProductTaxCodeManager: React.FC<ProductTaxCodeManagerProps> = ({
  accountId,
  calendarId
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncingServices, setSyncingServices] = useState<Set<string>>(new Set());

  // Get service types
  const { data: serviceTypes, isLoading: servicesLoading } = useQuery({
    queryKey: ['service-types', calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_types')
        .select('id, name, tax_code, stripe_test_price_id, stripe_live_price_id')
        .eq('calendar_id', calendarId)
        .eq('is_active', true);

      if (error) throw error;
      return data as ServiceType[];
    },
    enabled: !!calendarId,
  });

  // Get available tax codes
  const { data: taxCodesData, isLoading: taxCodesLoading } = useQuery({
    queryKey: ['tax-codes', accountId],
    queryFn: async () => {
      if (!accountId) return null;

      const { data, error } = await supabase.functions.invoke('get-tax-codes', {
        body: { test_mode: true }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });

  const updateTaxCodeMutation = useMutation({
    mutationFn: async ({ serviceTypeId, taxCode }: { serviceTypeId: string; taxCode: string }) => {
      // Update in database first
      const { error: dbError } = await supabase
        .from('service_types')
        .update({ tax_code: taxCode })
        .eq('id', serviceTypeId);

      if (dbError) throw dbError;

      // Sync with Stripe
      const { data, error } = await supabase.functions.invoke('update-service-tax-codes', {
        body: {
          service_type_id: serviceTypeId,
          tax_code: taxCode,
          test_mode: true
        }
      });

      if (error) throw error;
      return data;
    },
    onMutate: ({ serviceTypeId }) => {
      setSyncingServices(prev => new Set(prev).add(serviceTypeId));
    },
    onSettled: (_, __, { serviceTypeId }) => {
      setSyncingServices(prev => {
        const newSet = new Set(prev);
        newSet.delete(serviceTypeId);
        return newSet;
      });
    },
    onSuccess: (_, { serviceTypeId }) => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
      toast({
        title: "Tax Code Updated",
        description: "Service tax code has been updated and synced with Stripe"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tax code",
        variant: "destructive"
      });
    }
  });

  const handleUpdateTaxCode = (serviceTypeId: string, taxCode: string) => {
    updateTaxCodeMutation.mutate({ serviceTypeId, taxCode });
  };

  const getSyncStatus = (service: ServiceType) => {
    const hasStripePrice = service.stripe_test_price_id || service.stripe_live_price_id;
    const hasTaxCode = !!service.tax_code;
    
    if (hasTaxCode && hasStripePrice) {
      return { status: 'synced', icon: Check, color: 'success' };
    } else if (hasTaxCode && !hasStripePrice) {
      return { status: 'pending', icon: ArrowRightLeft, color: 'warning' };
    } else {
      return { status: 'missing', icon: X, color: 'destructive' };
    }
  };

  const availableTaxCodes: TaxCode[] = taxCodesData?.taxCodes || COMMON_TAX_CODES;

  if (!accountId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Connect your Stripe account to manage product tax codes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Tag className="w-5 h-5 text-primary" />
              Product Tax Codes
            </CardTitle>
            <CardDescription>
              Assign tax codes to your services for accurate tax calculation
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {servicesLoading || taxCodesLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : serviceTypes && serviceTypes.length > 0 ? (
          <div className="space-y-4">
            {serviceTypes.map((service) => {
              const syncStatus = getSyncStatus(service);
              const isSyncing = syncingServices.has(service.id);
              const StatusIcon = syncStatus.icon;
              
              return (
                <div 
                  key={service.id}
                  className="flex items-center justify-between p-4 bg-card rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium">{service.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={syncStatus.color as any} className="text-xs">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {syncStatus.status === 'synced' && 'Synced'}
                            {syncStatus.status === 'pending' && 'Pending Sync'}
                            {syncStatus.status === 'missing' && 'No Tax Code'}
                          </Badge>
                          {service.tax_code && (
                            <span className="text-xs text-muted-foreground">
                              {service.tax_code}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-64">
                        <Select
                          value={service.tax_code || ''}
                          onValueChange={(value) => handleUpdateTaxCode(service.id, value)}
                          disabled={isSyncing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tax code" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTaxCodes.map((taxCode) => (
                              <SelectItem key={taxCode.id} value={taxCode.id}>
                                <div>
                                  <div className="font-medium">{taxCode.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {taxCode.description}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {isSyncing && (
                        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                <p>Tax codes help ensure accurate tax calculation for your services.</p>
                <p className="mt-1">Changes are automatically synced with Stripe when you have active price IDs.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No services found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create services in your calendar to assign tax codes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};