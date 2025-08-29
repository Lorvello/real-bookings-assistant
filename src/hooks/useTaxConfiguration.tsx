import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStripeMode } from '@/utils/stripeConfig';

export interface TaxConfigurationStatus {
  stripeAccountReady: boolean;
  originAddressConfigured: boolean;
  hasActiveTaxRegistrations: boolean;
  serviceTypesConfigured: boolean;
  automaticTaxEnabled: boolean;
  isFullyConfigured: boolean;
  nextSteps: string[];
}

export const useTaxConfiguration = (calendarId?: string) => {
  const [status, setStatus] = useState<TaxConfigurationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkTaxConfiguration = async () => {
    if (!calendarId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('get-tax-settings', {
        body: { 
          calendar_id: calendarId,
          test_mode: getStripeMode() === 'test' 
        }
      });

      if (error) throw error;

      if (data?.success) {
        const nextSteps: string[] = [];
        
        // Check Stripe account status - use onboarding_completed and charges_enabled
        const stripeAccountReady = data.stripeAccountStatus?.onboardingCompleted && data.stripeAccountStatus?.chargesEnabled;
        if (!stripeAccountReady) {
          nextSteps.push('Complete Stripe Connect onboarding');
        }

        // Check origin address configuration - check for line1, postal_code, and country
        const originAddress = data.taxSettings?.originAddress;
        const originAddressConfigured = !!(originAddress?.line1 && originAddress?.postal_code && originAddress?.country);
        if (!originAddressConfigured && stripeAccountReady) {
          nextSteps.push('Configure your business origin address');
        }

        // Check tax registrations
        const hasActiveTaxRegistrations = data.taxRegistrations?.length > 0;
        if (!hasActiveTaxRegistrations) {
          nextSteps.push('Register for tax collection in your jurisdictions');
        }

        // Check automatic tax - this is implied when registrations exist
        const automaticTaxEnabled = hasActiveTaxRegistrations;

        // Check service types configuration
        const { data: serviceTypes } = await supabase
          .from('service_types')
          .select('id, name, tax_code')
          .eq('calendar_id', calendarId)
          .eq('is_active', true);

        const serviceTypesConfigured = serviceTypes?.every(st => st.tax_code) || false;
        if (!serviceTypesConfigured && serviceTypes?.length > 0) {
          nextSteps.push('Configure tax codes for your services');
        }

        const isFullyConfigured = stripeAccountReady && 
          originAddressConfigured && 
          hasActiveTaxRegistrations && 
          serviceTypesConfigured;

        setStatus({
          stripeAccountReady,
          originAddressConfigured,
          hasActiveTaxRegistrations,
          serviceTypesConfigured,
          automaticTaxEnabled,
          isFullyConfigured,
          nextSteps
        });
      }
    } catch (error) {
      console.error('Failed to check tax configuration:', error);
      toast({
        title: "Error",
        description: "Failed to check tax configuration status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTaxConfiguration();
  }, [calendarId]);

  return {
    status,
    loading,
    refetch: checkTaxConfiguration
  };
};