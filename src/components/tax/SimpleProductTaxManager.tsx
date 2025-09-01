import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SimpleProductTaxManagerProps {
  accountId?: string;
  calendarId?: string;
}

interface ServiceType {
  id: string;
  name: string;
  price: number;
  tax_enabled: boolean;
  tax_code: string | null;
  tax_behavior: string;
  stripe_test_price_id: string | null;
  stripe_live_price_id: string | null;
}

// Simple relevant tax codes for Dutch businesses
const RELEVANT_TAX_CODES = [
  { code: 'txcd_10000000', name: 'Standaard Service (21% BTW)', description: 'De meeste dienstverlening' },
  { code: 'txcd_20030000', name: 'Persoonlijke Verzorging (21% BTW)', description: 'Kapper, schoonheid, wellness' },
  { code: 'txcd_30060000', name: 'Professionele Diensten (21% BTW)', description: 'Consultancy, advies, coaching' },
  { code: 'txcd_30070000', name: 'Medische Zorg (0% BTW)', description: 'Medische behandelingen, fysiotherapie' }
];

export const SimpleProductTaxManager = ({ 
  accountId, 
  calendarId 
}: SimpleProductTaxManagerProps) => {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (calendarId) {
      fetchServices();
    }
  }, [calendarId]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_types')
        .select('id, name, price, tax_enabled, tax_code, tax_behavior, stripe_test_price_id, stripe_live_price_id')
        .eq('calendar_id', calendarId)
        .eq('is_active', true);

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
      toast({
        title: "Fout bij Laden Services",
        description: "Kon services niet laden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateServiceTax = async (serviceId: string, taxCode: string) => {
    setSaving(serviceId);
    try {
      const selectedTaxCode = RELEVANT_TAX_CODES.find(tc => tc.code === taxCode);
      
      const { error } = await supabase
        .from('service_types')
        .update({
          tax_enabled: true,
          tax_code: taxCode,
          tax_behavior: 'exclusive' // Standard for Dutch business
        })
        .eq('id', serviceId);

      if (error) throw error;

      // Update local state
      setServices(prev => prev.map(service => 
        service.id === serviceId 
          ? { ...service, tax_enabled: true, tax_code: taxCode, tax_behavior: 'exclusive' }
          : service
      ));

      toast({
        title: "BTW Code Bijgewerkt",
        description: `${selectedTaxCode?.name} toegepast`
      });

    } catch (error: any) {
      console.error('Failed to update service tax:', error);
      toast({
        title: "Fout bij Bijwerken",
        description: error.message || "Kon BTW code niet bijwerken",
        variant: "destructive"
      });
    } finally {
      setSaving(null);
    }
  };

  const getServiceStatus = (service: ServiceType) => {
    const hasStripePrice = service.stripe_test_price_id || service.stripe_live_price_id;
    const hasTaxCode = service.tax_enabled && service.tax_code;
    
    if (hasStripePrice && hasTaxCode) {
      return { status: 'complete', text: 'Volledig Geconfigureerd', variant: 'default' as const };
    } else if (hasStripePrice || hasTaxCode) {
      return { status: 'partial', text: 'Gedeeltelijk Geconfigureerd', variant: 'secondary' as const };
    } else {
      return { status: 'none', text: 'Niet Geconfigureerd', variant: 'destructive' as const };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Services laden...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Service BTW Codes
        </CardTitle>
        <CardDescription>
          Stel BTW codes in voor je services (vereist voor automatische BTW berekening)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Geen actieve services gevonden</p>
            <p className="text-sm">Voeg eerst services toe in de Services tab</p>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => {
              const status = getServiceStatus(service);
              const currentTaxCode = RELEVANT_TAX_CODES.find(tc => tc.code === service.tax_code);
              
              return (
                <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{service.name}</h4>
                      <Badge variant={status.variant}>{status.text}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      €{service.price} • {currentTaxCode?.name || 'Geen BTW code'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select
                      value={service.tax_code || ''}
                      onValueChange={(value) => updateServiceTax(service.id, value)}
                      disabled={saving === service.id}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Kies BTW code" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELEVANT_TAX_CODES.map((taxCode) => (
                          <SelectItem key={taxCode.code} value={taxCode.code}>
                            <div>
                              <div className="font-medium">{taxCode.name}</div>
                              <div className="text-xs text-muted-foreground">{taxCode.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {saving === service.id && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};