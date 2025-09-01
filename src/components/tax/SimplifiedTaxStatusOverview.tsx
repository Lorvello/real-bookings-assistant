import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Clock, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SimplifiedTaxStatusOverviewProps {
  accountId?: string;
  calendarId?: string;
}

interface TaxStatus {
  connection: 'active' | 'inactive' | 'error';
  compliance: 'compliant' | 'needs_attention' | 'not_configured';
  services: 'configured' | 'partial' | 'none';
  registrations: 'configured' | 'missing';
}

export const SimplifiedTaxStatusOverview = ({ 
  accountId, 
  calendarId 
}: SimplifiedTaxStatusOverviewProps) => {
  const [status, setStatus] = useState<TaxStatus>({
    connection: 'inactive',
    compliance: 'not_configured',
    services: 'none',
    registrations: 'missing'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountId && calendarId) {
      checkTaxStatus();
    }
  }, [accountId, calendarId]);

  const checkTaxStatus = async () => {
    try {
      setLoading(true);

      // Check services with Stripe Price IDs
      const { data: services } = await supabase
        .from('service_types')
        .select('id, name, price, stripe_test_price_id, stripe_live_price_id, tax_enabled')
        .eq('calendar_id', calendarId)
        .eq('is_active', true);

      const totalServices = services?.length || 0;
      const servicesWithPriceIds = services?.filter(s => 
        s.stripe_test_price_id || s.stripe_live_price_id
      ).length || 0;

      // Determine service status
      let serviceStatus: 'configured' | 'partial' | 'none' = 'none';
      if (totalServices === 0) {
        serviceStatus = 'none';
      } else if (servicesWithPriceIds === totalServices) {
        serviceStatus = 'configured';
      } else if (servicesWithPriceIds > 0) {
        serviceStatus = 'partial';
      }

      // Check tax registrations via API
      let registrationStatus: 'configured' | 'missing' = 'missing';
      try {
        const { data: registrations } = await supabase.functions.invoke('manage-tax-registrations', {
          body: { action: 'list', test_mode: true }
        });

        if (registrations?.success && registrations.registrations?.length > 0) {
          registrationStatus = 'configured';
        }
      } catch (error) {
        console.log('Tax registrations check failed:', error);
      }

      // Determine overall status
      const connectionActive = accountId ? 'active' : 'inactive';
      const complianceStatus = registrationStatus === 'configured' && serviceStatus === 'configured' 
        ? 'compliant' 
        : registrationStatus === 'configured' || serviceStatus !== 'none'
        ? 'needs_attention'
        : 'not_configured';

      setStatus({
        connection: connectionActive,
        compliance: complianceStatus,
        services: serviceStatus,
        registrations: registrationStatus
      });

    } catch (error) {
      console.error('Failed to check tax status:', error);
      setStatus({
        connection: 'error',
        compliance: 'not_configured',
        services: 'none',
        registrations: 'missing'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (statusType: string, value: string) => {
    if (loading) return <Clock className="w-4 h-4 animate-spin" />;
    
    switch (value) {
      case 'active':
      case 'compliant':
      case 'configured':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'needs_attention':
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'inactive':
      case 'not_configured':
      case 'none':
      case 'missing':
      case 'error':
      default:
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusText = (statusType: string, value: string) => {
    switch (statusType) {
      case 'connection':
        switch (value) {
          case 'active': return 'BTW Collectie Actief';
          case 'inactive': return 'Niet Actief';
          case 'error': return 'Fout';
          default: return 'Onbekend';
        }
      case 'compliance':
        switch (value) {
          case 'compliant': return 'Volledig Geconfigureerd';
          case 'needs_attention': return 'Actie Vereist';
          case 'not_configured': return 'Niet Geconfigureerd';
          default: return 'Onbekend';
        }
      case 'services':
        switch (value) {
          case 'configured': return 'Alle Services Gekoppeld';
          case 'partial': return 'Gedeeltelijk Gekoppeld';
          case 'none': return 'Niet Gekoppeld';
          default: return 'Onbekend';
        }
      case 'registrations':
        switch (value) {
          case 'configured': return 'Nederland Geregistreerd';
          case 'missing': return 'Geen Registraties';
          default: return 'Onbekend';
        }
      default:
        return 'Onbekend';
    }
  };

  const getStatusVariant = (value: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (value) {
      case 'active':
      case 'compliant':
      case 'configured':
        return 'default';
      case 'needs_attention':
      case 'partial':
        return 'secondary';
      case 'inactive':
      case 'not_configured':
      case 'none':
      case 'missing':
      case 'error':
      default:
        return 'destructive';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          BTW Status Overzicht
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon('connection', status.connection)}
                <span className="text-sm font-medium">Connectie Status</span>
              </div>
              <Badge variant={getStatusVariant(status.connection)}>
                {getStatusText('connection', status.connection)}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon('compliance', status.compliance)}
                <span className="text-sm font-medium">Compliance Status</span>
              </div>
              <Badge variant={getStatusVariant(status.compliance)}>
                {getStatusText('compliance', status.compliance)}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon('services', status.services)}
                <span className="text-sm font-medium">Services</span>
              </div>
              <Badge variant={getStatusVariant(status.services)}>
                {getStatusText('services', status.services)}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon('registrations', status.registrations)}
                <span className="text-sm font-medium">Registraties</span>
              </div>
              <Badge variant={getStatusVariant(status.registrations)}>
                {getStatusText('registrations', status.registrations)}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};