import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Shield, 
  Globe,
  Settings,
  CreditCard,
  Receipt
} from 'lucide-react';

interface ComplianceStatus {
  tax_collection_active: boolean;
  services_configured: number;
  registrations_active: number;
  stripe_connected: boolean;
}

interface TaxComplianceStatusProps {
  status: ComplianceStatus;
  businessCountry: string;
  onRefresh?: () => void;
}

export const TaxComplianceStatus: React.FC<TaxComplianceStatusProps> = ({
  status,
  businessCountry,
  onRefresh
}) => {
  const navigate = useNavigate();
  
  const getCountryFlag = (countryCode: string) => {
    const flags: { [key: string]: string } = {
      'NL': '🇳🇱',
      'DE': '🇩🇪',
      'FR': '🇫🇷',
      'ES': '🇪🇸',
      'IT': '🇮🇹',
      'BE': '🇧🇪',
      'AT': '🇦🇹',
      'US': '🇺🇸',
      'GB': '🇬🇧',
      'CA': '🇨🇦'
    };
    return flags[countryCode] || '🌍';
  };

  const getTaxSystemName = (countryCode: string) => {
    const taxSystems: { [key: string]: string } = {
      'NL': 'VAT',
      'DE': 'VAT',
      'FR': 'VAT',
      'ES': 'VAT',
      'IT': 'VAT',
      'BE': 'VAT',
      'AT': 'VAT',
      'US': 'Sales Tax',
      'GB': 'VAT',
      'CA': 'GST/HST'
    };
    return taxSystems[countryCode] || 'Tax';
  };

  const statusItems = [
    {
      label: 'Payment Processing',
      status: status.stripe_connected,
      icon: CreditCard,
      description: status.stripe_connected 
        ? 'Stripe Connect is configured'
        : 'Stripe Connect setup required',
      action: !status.stripe_connected ? 'Setup Payments' : null,
      actionUrl: '/settings?tab=payments'
    },
    {
      label: `${getTaxSystemName(businessCountry)} Collection`,
      status: status.tax_collection_active,
      icon: Receipt,
      description: status.tax_collection_active
        ? `${getTaxSystemName(businessCountry)} collection is active`
        : `${getTaxSystemName(businessCountry)} collection disabled`,
      action: !status.tax_collection_active ? 'Enable Collection' : null,
      actionUrl: '/settings?tab=services'
    },
    {
      label: 'Services Configured',
      status: status.services_configured > 0,
      icon: Settings,
      description: `${status.services_configured} service${status.services_configured !== 1 ? 's' : ''} configured for tax`,
      action: status.services_configured === 0 ? 'Configure Services' : null,
      actionUrl: '/settings?tab=services'
    },
    {
      label: 'Tax Registrations',
      status: status.registrations_active > 0,
      icon: Globe,
      description: status.registrations_active > 0
        ? `Active in ${status.registrations_active} jurisdiction${status.registrations_active !== 1 ? 's' : ''}`
        : 'No active registrations',
      action: null // Registrations are handled by Stripe automatically
    }
  ];

  const getStatusIcon = (isActive: boolean) => {
    if (isActive) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusVariant = (isActive: boolean): "default" | "destructive" | "secondary" => {
    return isActive ? "default" : "destructive";
  };

  const overallCompliance = statusItems.filter(item => item.status).length / statusItems.length;
  const compliancePercentage = Math.round(overallCompliance * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Compliance Status
            <span className="text-lg">{getCountryFlag(businessCountry)}</span>
          </div>
          <Badge 
            variant={compliancePercentage >= 75 ? "default" : compliancePercentage >= 50 ? "secondary" : "destructive"}
            className="bg-green-600"
          >
            {compliancePercentage}% Complete
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {statusItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                
                {item.action && item.actionUrl && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(item.actionUrl!)}
                  >
                    {item.action}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {compliancePercentage < 100 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Setup Required</h4>
                <p className="text-sm text-amber-700">
                  Complete the remaining steps to ensure full {getTaxSystemName(businessCountry)} compliance for your business.
                </p>
              </div>
            </div>
          </div>
        )}

        {compliancePercentage === 100 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800">Fully Compliant</h4>
                <p className="text-sm text-green-700">
                  Your {getTaxSystemName(businessCountry)} setup is complete and compliant.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};