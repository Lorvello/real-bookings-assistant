import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Save, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStripeMode } from '@/utils/stripeConfig';

interface ServiceType {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  tax_code?: string;
}

interface TaxCode {
  id: string;
  name: string;
  description: string;
}

interface ServiceTypeTaxCodesProps {
  calendarId: string;
}

export const ServiceTypeTaxCodes: React.FC<ServiceTypeTaxCodesProps> = ({ calendarId }) => {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [changes, setChanges] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [calendarId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load service types
      const { data: serviceTypesData, error: serviceTypesError } = await supabase
        .from('service_types')
        .select('id, name, description, duration, price, tax_code')
        .eq('calendar_id', calendarId)
        .eq('is_active', true)
        .order('name');

      if (serviceTypesError) throw serviceTypesError;
      setServiceTypes(serviceTypesData || []);

      // Load tax codes from Stripe
      const { data: taxCodesData, error: taxCodesError } = await supabase.functions.invoke('get-tax-codes', {
        body: { test_mode: getStripeMode() === 'test' }
      });

      if (taxCodesError) throw taxCodesError;
      
      if (taxCodesData?.success) {
        setTaxCodes(taxCodesData.taxCodes || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: "Failed to load service types and tax codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaxCodeChange = (serviceTypeId: string, taxCode: string) => {
    setChanges(prev => ({
      ...prev,
      [serviceTypeId]: taxCode
    }));
  };

  const saveChanges = async (serviceTypeId: string) => {
    const taxCode = changes[serviceTypeId];
    if (!taxCode) return;

    setSaving(serviceTypeId);
    try {
      const { error } = await supabase
        .from('service_types')
        .update({ tax_code: taxCode })
        .eq('id', serviceTypeId);

      if (error) throw error;

      // Update local state
      setServiceTypes(prev => 
        prev.map(st => 
          st.id === serviceTypeId 
            ? { ...st, tax_code: taxCode }
            : st
        )
      );

      // Remove from changes
      setChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[serviceTypeId];
        return newChanges;
      });

      toast({
        title: "Success",
        description: "Tax code updated successfully",
      });
    } catch (error) {
      console.error('Failed to save tax code:', error);
      toast({
        title: "Error",
        description: "Failed to update tax code",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const getConfigurationStatus = () => {
    const configured = serviceTypes.filter(st => st.tax_code).length;
    const total = serviceTypes.length;
    return { configured, total, percentage: total > 0 ? (configured / total) * 100 : 0 };
  };

  const { configured, total, percentage } = getConfigurationStatus();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading service types and tax codes...</p>
        </CardContent>
      </Card>
    );
  }

  if (serviceTypes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Type Tax Codes</CardTitle>
          <CardDescription>Configure tax codes for your service types</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No active service types found. Create service types first to configure tax codes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Service Type Tax Codes</CardTitle>
            <CardDescription>
              Configure Stripe tax codes for automatic tax calculation
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={percentage === 100 ? "default" : "secondary"}>
              {configured}/{total} configured
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {percentage < 100 && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Configure tax codes for all service types to enable automatic tax calculation on payments.
            </AlertDescription>
          </Alert>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service Type</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Tax Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {serviceTypes.map((serviceType) => {
              const currentTaxCode = changes[serviceType.id] || serviceType.tax_code;
              const hasChanges = changes[serviceType.id] && changes[serviceType.id] !== serviceType.tax_code;
              const isConfigured = !!serviceType.tax_code;

              return (
                <TableRow key={serviceType.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{serviceType.name}</div>
                      {serviceType.description && (
                        <div className="text-sm text-muted-foreground">
                          {serviceType.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{serviceType.duration}min</TableCell>
                  <TableCell>€{serviceType.price}</TableCell>
                  <TableCell>
                    <Select
                      value={currentTaxCode || ''}
                      onValueChange={(value) => handleTaxCodeChange(serviceType.id, value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select tax code" />
                      </SelectTrigger>
                      <SelectContent>
                        {taxCodes.map((taxCode) => (
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
                  </TableCell>
                  <TableCell>
                    {isConfigured ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Not configured
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {hasChanges && (
                      <Button
                        size="sm"
                        onClick={() => saveChanges(serviceType.id)}
                        disabled={saving === serviceType.id}
                      >
                        {saving === serviceType.id ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {percentage === 100 && (
          <Alert className="mt-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All service types have tax codes configured. Automatic tax calculation is ready for payments.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};