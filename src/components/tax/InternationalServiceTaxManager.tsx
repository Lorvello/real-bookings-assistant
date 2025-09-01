import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  INTERNATIONAL_TAX_CONFIG, 
  detectBusinessCountry, 
  getTaxConfigForCountry,
  getTaxRatesForCountry,
  getSuggestedTaxRateForService,
  formatTaxRate,
  CountryTaxConfig,
  TaxRate
} from '@/utils/internationalTax';

interface InternationalServiceTaxManagerProps {
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
  business_country: string;
  service_category: string;
  applicable_tax_rate: number;
}

export const InternationalServiceTaxManager = ({ 
  accountId, 
  calendarId 
}: InternationalServiceTaxManagerProps) => {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [businessCountry, setBusinessCountry] = useState<string>('NL');
  const [countryConfig, setCountryConfig] = useState<CountryTaxConfig | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (accountId && calendarId) {
      detectCountry();
      fetchServices();
    }
  }, [accountId, calendarId]);

  const detectCountry = async () => {
    try {
      // Get Stripe account info to detect country
      const { data: stripeAccountData } = await supabase
        .from('business_stripe_accounts')
        .select('*')
        .eq('account_owner_id', accountId)
        .eq('charges_enabled', true)
        .single();

      if (stripeAccountData) {
        const detectedCountry = detectBusinessCountry(stripeAccountData);
        setBusinessCountry(detectedCountry);
        
        const config = getTaxConfigForCountry(detectedCountry);
        setCountryConfig(config);
      }
    } catch (error) {
      console.error('Failed to detect business country:', error);
      // Fallback to Netherlands
      const config = getTaxConfigForCountry('NL');
      setCountryConfig(config);
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_types')
        .select('id, name, price, tax_enabled, tax_code, tax_behavior, stripe_test_price_id, stripe_live_price_id, business_country, service_category, applicable_tax_rate')
        .eq('calendar_id', calendarId)
        .eq('is_active', true);

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
      toast({
        title: "Error Loading Services",
        description: "Could not load services",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateServiceTax = async (serviceId: string, selectedTaxRate: TaxRate) => {
    setSaving(serviceId);
    try {
      const { error } = await supabase
        .from('service_types')
        .update({
          tax_enabled: true,
          tax_code: selectedTaxRate.code,
          tax_behavior: 'exclusive', // Standard for most countries
          business_country: businessCountry,
          applicable_tax_rate: selectedTaxRate.rate,
          service_category: selectedTaxRate.applicableServices[0] || 'general'
        })
        .eq('id', serviceId);

      if (error) throw error;

      // Update local state
      setServices(prev => prev.map(service => 
        service.id === serviceId 
          ? { 
              ...service, 
              tax_enabled: true, 
              tax_code: selectedTaxRate.code, 
              tax_behavior: 'exclusive',
              business_country: businessCountry,
              applicable_tax_rate: selectedTaxRate.rate
            }
          : service
      ));

      toast({
        title: "Tax Code Updated",
        description: `${selectedTaxRate.name} applied`
      });

    } catch (error: any) {
      console.error('Failed to update service tax:', error);
      toast({
        title: "Update Error",
        description: error.message || "Could not update tax code",
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
      return { status: 'complete', text: 'Fully Configured', variant: 'default' as const };
    } else if (hasStripePrice || hasTaxCode) {
      return { status: 'partial', text: 'Partially Configured', variant: 'secondary' as const };
    } else {
      return { status: 'none', text: 'Not Configured', variant: 'destructive' as const };
    }
  };

  const getSelectedTaxRate = (service: ServiceType): TaxRate | null => {
    if (!countryConfig) return null;
    return countryConfig.rates.find(rate => rate.code === service.tax_code) || null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading services...</p>
        </CardContent>
      </Card>
    );
  }

  if (!countryConfig) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">Could not load tax configuration</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          <span className="text-xl">{countryConfig.flag}</span>
          Service {countryConfig.taxSystemName} Codes
        </CardTitle>
        <CardDescription>
          Configure {countryConfig.taxSystemName} rates for your services in {countryConfig.countryName} 
          (required for automatic tax calculation)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No active services found</p>
            <p className="text-sm">Add services first in the Services tab</p>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => {
              const status = getServiceStatus(service);
              const currentTaxRate = getSelectedTaxRate(service);
              const suggestedRate = getSuggestedTaxRateForService(businessCountry, service.name);
              
              return (
                <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{service.name}</h4>
                      <Badge variant={status.variant}>{status.text}</Badge>
                      {service.business_country && service.business_country !== businessCountry && (
                        <Badge variant="outline" className="text-xs">
                          {service.business_country}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {countryConfig.currency} {service.price} • {
                        currentTaxRate 
                          ? formatTaxRate(currentTaxRate, countryConfig)
                          : `No ${countryConfig.taxSystemName} code`
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select
                      value={service.tax_code || ''}
                      onValueChange={(value) => {
                        const selectedRate = countryConfig.rates.find(rate => rate.code === value);
                        if (selectedRate) {
                          updateServiceTax(service.id, selectedRate);
                        }
                      }}
                      disabled={saving === service.id}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={`Choose ${countryConfig.taxSystemName} rate`} />
                      </SelectTrigger>
                      <SelectContent>
                        {countryConfig.rates.map((taxRate) => (
                          <SelectItem key={taxRate.code} value={taxRate.code}>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{taxRate.name}</span>
                                {suggestedRate?.code === taxRate.code && (
                                  <Badge variant="secondary" className="text-xs">Suggested</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{taxRate.description}</div>
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