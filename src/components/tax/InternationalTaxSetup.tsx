import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, MapPin, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  INTERNATIONAL_TAX_CONFIG, 
  detectBusinessCountry, 
  getTaxConfigForCountry,
  CountryTaxConfig 
} from '@/utils/internationalTax';

interface InternationalTaxSetupProps {
  accountId?: string;
  calendarId?: string;
}

export const InternationalTaxSetup = ({ 
  accountId, 
  calendarId 
}: InternationalTaxSetupProps) => {
  const [loading, setLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [businessCountry, setBusinessCountry] = useState<string>('NL');
  const [countryConfig, setCountryConfig] = useState<CountryTaxConfig | null>(null);
  const [hasRegistration, setHasRegistration] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (accountId && calendarId) {
      detectAndSetupCountry();
    }
  }, [accountId, calendarId]);

  const detectAndSetupCountry = async () => {
    try {
      setLoading(true);

      // Get Stripe account info to detect country
      const { data: stripeAccountData } = await supabase
        .from('business_stripe_accounts')
        .select('*')
        .eq('stripe_account_id', accountId)
        .eq('charges_enabled', true)
        .maybeSingle();

      if (stripeAccountData) {
        setStripeAccount(stripeAccountData);
        const detectedCountry = detectBusinessCountry(stripeAccountData);
        setBusinessCountry(detectedCountry);
        
        const config = getTaxConfigForCountry(detectedCountry);
        setCountryConfig(config);

        // Check existing tax registrations
        await checkTaxRegistrations(detectedCountry);
      }
    } catch (error) {
      console.error('Failed to detect business country:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTaxRegistrations = async (country: string) => {
    try {
      const { data: registrations } = await supabase.functions.invoke('manage-tax-registrations', {
        body: { action: 'list', test_mode: true }
      });

      if (registrations?.success && registrations.registrations?.length > 0) {
        const hasCountryRegistration = registrations.registrations.some(
          (reg: any) => reg.country === country && reg.status === 'active'
        );
        setHasRegistration(hasCountryRegistration);
      }
    } catch (error) {
      console.log('Tax registrations check failed:', error);
    }
  };

  const setupCountryTaxRegistration = async () => {
    if (!businessCountry || !countryConfig) return;
    
    setIsSettingUp(true);
    try {
      const { data } = await supabase.functions.invoke('manage-tax-registrations', {
        body: { 
          action: 'create',
          country: businessCountry,
          test_mode: true
        }
      });

      if (data?.success) {
        setHasRegistration(true);
        toast({
          title: `${countryConfig.countryName} Tax Registration Added`,
          description: `Your account is now configured for ${countryConfig.taxSystemName} collection in ${countryConfig.countryName}`
        });

        // Create tax configuration record
        await createTaxConfiguration();
      } else if (data?.code === 'UPGRADE_REQUIRED') {
        toast({
          title: "Professional Feature Required",
          description: "International tax management requires Professional or Enterprise subscription",
          variant: "destructive"
        });
      } else {
        throw new Error(data?.error || 'Failed to create tax registration');
      }
    } catch (error: any) {
      toast({
        title: "Tax Setup Error",
        description: error.message || "An error occurred while configuring the tax registration",
        variant: "destructive"
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const createTaxConfiguration = async () => {
    if (!calendarId || !countryConfig) return;

    try {
      const { error } = await supabase
        .from('tax_configurations')
        .upsert({
          calendar_id: calendarId,
          country_code: businessCountry,
          tax_system_name: countryConfig.taxSystemName,
          default_tax_rate: countryConfig.rates[0]?.rate || 0,
          default_tax_code: countryConfig.defaultTaxCode,
          multi_country_business: false
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to create tax configuration:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Detecting business location...</p>
        </CardContent>
      </Card>
    );
  }

  if (!countryConfig) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">
            Could not detect business country. Please ensure your Stripe account is properly configured.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">{countryConfig.flag}</span>
          {countryConfig.countryName} {countryConfig.taxSystemName} Setup
        </CardTitle>
        <CardDescription>
          Automatic {countryConfig.taxSystemName} configuration for {countryConfig.countryName} businesses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasRegistration ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              {countryConfig.countryName} {countryConfig.taxSystemName} registration is active. 
              Your services will automatically include the correct tax rates:
              <ul className="mt-2 ml-4 list-disc text-sm">
                {countryConfig.rates.slice(0, 3).map((rate, index) => (
                  <li key={index}>{rate.name} - {rate.description}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                For {countryConfig.countryName} businesses: Automatically configure {countryConfig.taxSystemName} collection 
                with the following rates:
                <ul className="mt-2 ml-4 list-disc text-sm">
                  {countryConfig.rates.slice(0, 3).map((rate, index) => (
                    <li key={index}>{rate.name} - {rate.description}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>

            <Button 
              onClick={setupCountryTaxRegistration}
              disabled={isSettingUp}
              className="w-full"
            >
              {isSettingUp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up {countryConfig.taxSystemName}...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Configure {countryConfig.countryName} {countryConfig.taxSystemName}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};