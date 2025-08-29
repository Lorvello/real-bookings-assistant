import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Circle, 
  ArrowRight, 
  AlertTriangle,
  Settings,
  FileText,
  Calculator,
  Shield
} from 'lucide-react';
import type { TaxConfigurationStatus } from '@/hooks/useTaxConfiguration';

interface TaxConfigurationProgressProps {
  status: TaxConfigurationStatus;
  onStripeOnboarding: () => void;
  onOpenTaxSettings: () => void;
  onOpenTaxRegistrations: () => void;
  onConfigureServiceTypes: () => void;
}

export const TaxConfigurationProgress: React.FC<TaxConfigurationProgressProps> = ({
  status,
  onStripeOnboarding,
  onOpenTaxSettings,
  onOpenTaxRegistrations,
  onConfigureServiceTypes
}) => {
  const steps = [
    {
      id: 'stripe',
      title: 'Stripe Connect Setup',
      description: 'Complete your Stripe account onboarding',
      completed: status.stripeAccountReady,
      action: onStripeOnboarding,
      icon: Shield
    },
    {
      id: 'address',
      title: 'Business Address',
      description: 'Configure your business origin address',
      completed: status.originAddressConfigured,
      action: onOpenTaxSettings,
      icon: Settings
    },
    {
      id: 'registrations',
      title: 'Tax Registrations',
      description: 'Register for tax collection in your jurisdictions',
      completed: status.hasActiveTaxRegistrations,
      action: onOpenTaxRegistrations,
      icon: FileText
    },
    {
      id: 'services',
      title: 'Service Tax Codes',
      description: 'Configure tax codes for your service types',
      completed: status.serviceTypesConfigured,
      action: onConfigureServiceTypes,
      icon: Calculator
    }
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  if (status.isFullyConfigured) {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Tax configuration is complete! Automatic tax calculation is enabled for all payments.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-warning bg-warning/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-warning flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Tax Configuration Required
            </CardTitle>
            <CardDescription>
              Complete the setup to enable automatic tax compliance
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {completedSteps}/{steps.length} steps completed
          </Badge>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isNext = !step.completed && steps.slice(0, index).every(s => s.completed);
          
          return (
            <div 
              key={step.id} 
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                step.completed 
                  ? 'bg-green-50 border-green-200' 
                  : isNext 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-400" />
                )}
              </div>
              
              <Icon className={`w-5 h-5 flex-shrink-0 ${
                step.completed ? 'text-green-600' : 'text-gray-500'
              }`} />
              
              <div className="flex-1">
                <h4 className={`font-medium ${
                  step.completed ? 'text-green-900' : 'text-gray-900'
                }`}>
                  {step.title}
                </h4>
                <p className={`text-sm ${
                  step.completed ? 'text-green-700' : 'text-gray-600'
                }`}>
                  {step.description}
                </p>
              </div>
              
              {!step.completed && (
                <Button
                  variant={isNext ? "default" : "outline"}
                  size="sm"
                  onClick={step.action}
                  className="flex-shrink-0"
                >
                  {isNext ? 'Start' : 'Configure'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          );
        })}

        {status.nextSteps.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Next steps:</div>
              <ul className="list-disc list-inside space-y-1">
                {status.nextSteps.map((step, index) => (
                  <li key={index} className="text-sm">{step}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};