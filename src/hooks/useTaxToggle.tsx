import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useTaxToggle() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const toggleTaxConfigured = async (configured: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('toggle-company-tax-configured', {
        body: { configured }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to update tax configuration');
      }

      toast({
        title: configured ? 'Tax Configuration Enabled' : 'Tax Configuration Disabled',
        description: configured 
          ? 'You can now enable tax on individual services'
          : 'Tax has been disabled for your account'
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update tax configuration',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    toggleTaxConfigured,
    loading
  };
}