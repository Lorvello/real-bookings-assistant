import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Zap, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutoTaxSetupProps {
  accountId?: string;
  calendarId?: string;
}

export const AutoTaxSetup = ({ accountId, calendarId }: AutoTaxSetupProps) => {
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [hasNLRegistration, setHasNLRegistration] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkTaxRegistrations();
  }, [accountId]);

  const checkTaxRegistrations = async () => {
    if (!accountId) return;
    
    try {
      setLoading(true);
      const { data } = await supabase.functions.invoke('manage-tax-registrations', {
        body: { action: 'list', test_mode: true }
      });

      if (data?.success && data.registrations) {
        const nlRegistration = data.registrations.find((reg: any) => 
          reg.country === 'NL' && reg.status === 'active'
        );
        setHasNLRegistration(!!nlRegistration);
      }
    } catch (error) {
      console.error('Failed to check tax registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupDutchTax = async () => {
    setIsSettingUp(true);
    try {
      // Create Netherlands tax registration
      const { data, error } = await supabase.functions.invoke('manage-tax-registrations', {
        body: { 
          action: 'create', 
          country: 'NL',
          test_mode: true 
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to create tax registration');
      }

      setHasNLRegistration(true);
      toast({
        title: "Netherlands VAT Registration Added",
        description: "Your account is now configured for Dutch VAT collection"
      });

      // Refresh status
      await checkTaxRegistrations();

    } catch (error: any) {
      console.error('Failed to setup Dutch tax:', error);
      toast({
        title: "VAT Setup Error",
        description: error.message || "An error occurred while configuring the VAT registration",
        variant: "destructive"
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Checking registrations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Netherlands VAT Setup
        </CardTitle>
        <CardDescription>
          Automatic configuration for Dutch businesses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasNLRegistration ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Netherlands VAT registration is active. Your services automatically collect VAT for Dutch customers.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                For Dutch businesses: Automatically add a Netherlands VAT registration to collect VAT from customers.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={setupDutchTax}
              disabled={isSettingUp}
              className="w-full"
            >
              {isSettingUp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing VAT Setup...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Configure Netherlands VAT
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};