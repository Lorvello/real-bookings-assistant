import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Plus, Trash2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaxRegistrationsManagerProps {
  accountId?: string;
  calendarId?: string;
}

interface TaxRegistration {
  id: string;
  country: string;
  status: string;
  active_from: number;
  expires_at?: number;
  type: string;
  country_options?: any;
}

const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'NO', name: 'Norway' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
];

export const TaxRegistrationsManager: React.FC<TaxRegistrationsManagerProps> = ({
  accountId,
  calendarId
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [vatId, setVatId] = useState('');

  const { data: registrationsData, isLoading, refetch } = useQuery({
    queryKey: ['tax-registrations', accountId, calendarId],
    queryFn: async () => {
      if (!accountId) return null;

      const { data, error } = await supabase.functions.invoke('manage-tax-registrations', {
        body: {
          action: 'list',
          calendar_id: calendarId,
          test_mode: true
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });

  const createRegistrationMutation = useMutation({
    mutationFn: async ({ country, vat_id }: { country: string; vat_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-tax-registrations', {
        body: {
          action: 'create',
          country,
          vat_id,
          calendar_id: calendarId,
          test_mode: true
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-registrations'] });
      setShowAddForm(false);
      setSelectedCountry('');
      setVatId('');
      toast({
        title: "Registration Created",
        description: "Tax registration has been successfully created"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tax registration",
        variant: "destructive"
      });
    }
  });

  const deleteRegistrationMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-tax-registrations', {
        body: {
          action: 'delete',
          registration_id: registrationId,
          calendar_id: calendarId,
          test_mode: true
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-registrations'] });
      toast({
        title: "Registration Removed",
        description: "Tax registration has been successfully removed"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove tax registration",
        variant: "destructive"
      });
    }
  });

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Tax registrations have been updated"
    });
  };

  const handleCreateRegistration = () => {
    if (!selectedCountry) return;
    createRegistrationMutation.mutate({ 
      country: selectedCountry, 
      vat_id: vatId || undefined 
    });
  };

  const handleDeleteRegistration = (registrationId: string) => {
    deleteRegistrationMutation.mutate(registrationId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const registrations: TaxRegistration[] = registrationsData?.registrations || [];

  if (!accountId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Connect your Stripe account to manage tax registrations</p>
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
              <FileText className="w-5 h-5 text-primary" />
              Tax Registrations
            </CardTitle>
            <CardDescription>
              Manage your tax registrations for different countries
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="w-4 h-4" />
              Add Registration
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map(country => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="vat-id">VAT ID (Optional)</Label>
                    <Input
                      id="vat-id"
                      placeholder="e.g., GB123456789"
                      value={vatId}
                      onChange={(e) => setVatId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateRegistration}
                    disabled={!selectedCountry || createRegistrationMutation.isPending}
                  >
                    {createRegistrationMutation.isPending ? 'Creating...' : 'Create Registration'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedCountry('');
                      setVatId('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : registrations.length > 0 ? (
          <div className="space-y-3">
            {registrations.map((registration) => {
              const country = COUNTRY_OPTIONS.find(c => c.code === registration.country);
              const vatId = registration.country_options?.[registration.country.toLowerCase()]?.value;
              
              return (
                <div 
                  key={registration.id}
                  className="flex items-center justify-between p-4 bg-card rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(registration.status)}
                      <div>
                        <h3 className="font-medium">{country?.name || registration.country}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant={getStatusColor(registration.status) as any}>
                            {registration.status}
                          </Badge>
                          {vatId && <span>VAT ID: {vatId}</span>}
                          <span>
                            Active from: {new Date(registration.active_from * 1000).toLocaleDateString('nl-NL')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRegistration(registration.id)}
                    disabled={deleteRegistrationMutation.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground text-center">
                Last updated: {new Date(registrationsData?.lastUpdated || '').toLocaleString('nl-NL')}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tax registrations configured yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add registrations for countries where you need to collect tax
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};