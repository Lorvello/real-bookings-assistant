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
        title: "Nederland BTW Registratie Toegevoegd",
        description: "Je account is nu geconfigureerd voor Nederlandse BTW collectie"
      });

      // Refresh status
      await checkTaxRegistrations();

    } catch (error: any) {
      console.error('Failed to setup Dutch tax:', error);
      toast({
        title: "Fout bij BTW Setup",
        description: error.message || "Er is een fout opgetreden bij het configureren van de BTW registratie",
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
          <p className="text-sm text-muted-foreground">Controleren registraties...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Nederlandse BTW Setup
        </CardTitle>
        <CardDescription>
          Automatische configuratie voor Nederlandse bedrijven
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasNLRegistration ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Nederland BTW registratie is actief. Je services collecteren automatisch BTW voor Nederlandse klanten.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Voor Nederlandse bedrijven: Voeg automatisch een Nederland BTW registratie toe om BTW te collecteren van klanten.
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
                  BTW Setup Uitvoeren...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Configureer Nederlandse BTW
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};