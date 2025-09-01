import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Zap,
  ArrowRight,
  Globe,
  CreditCard,
  FileText,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutomatedTaxSetupProps {
  calendarId: string;
  onSetupComplete?: () => void;
}

interface TaxRequirements {
  business_country: string;
  tax_system: {
    name: string;
    rate: number;
    currency: string;
    flag: string;
  };
  registration_required: boolean;
  registration_recommended: boolean;
  has_existing_registration: boolean;
  threshold?: {
    amount: number;
    currency: string;
    description: string;
  };
  current_revenue: number;
  next_steps: string[];
}

export const AutomatedTaxSetup = ({ calendarId, onSetupComplete }: AutomatedTaxSetupProps) => {
  const [loading, setLoading] = useState(true);
  const [setupInProgress, setSetupInProgress] = useState(false);
  const [requirements, setRequirements] = useState<TaxRequirements | null>(null);
  const [setupProgress, setSetupProgress] = useState(0);
  const [setupSteps, setSetupSteps] = useState<string[]>([]);
  const [setupComplete, setSetupComplete] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (calendarId) {
      detectTaxRequirements();
    }
  }, [calendarId]);

  const detectTaxRequirements = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('detect-tax-requirements', {
        body: { 
          test_mode: true, 
          calendar_id: calendarId 
        }
      });

      if (error) throw error;

      if (data?.success) {
        setRequirements(data);
      } else {
        throw new Error(data?.error || 'Failed to detect tax requirements');
      }
    } catch (error: any) {
      console.error('Failed to detect tax requirements:', error);
      toast({
        title: "Detection Failed",
        description: error.message || "Could not detect tax requirements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runAutomatedSetup = async () => {
    if (!requirements) return;
    
    try {
      setSetupInProgress(true);
      setSetupProgress(0);
      setSetupSteps(['Initializing automated tax setup...']);

      const { data, error } = await supabase.functions.invoke('auto-setup-tax', {
        body: { 
          test_mode: true, 
          calendar_id: calendarId 
        }
      });

      if (error) throw error;

      if (data?.success) {
        setSetupProgress(100);
        setSetupSteps(data.setup_steps || []);
        setSetupComplete(data.setup_complete);
        
        toast({
          title: data.setup_complete ? "Tax Setup Complete!" : "Setup Partially Complete",
          description: data.message
        });

        if (data.setup_complete) {
          onSetupComplete?.();
        }
      } else if (data?.code === 'UPGRADE_REQUIRED') {
        toast({
          title: "Professional Feature Required",
          description: "Automated tax setup requires Professional or Enterprise subscription",
          variant: "destructive"
        });
      } else {
        throw new Error(data?.error || 'Setup failed');
      }
    } catch (error: any) {
      console.error('Automated setup failed:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "An error occurred during automated setup",
        variant: "destructive"
      });
    } finally {
      setSetupInProgress(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Analyzing your business requirements...</p>
        </CardContent>
      </Card>
    );
  }

  if (!requirements) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Could not detect business requirements. Please ensure your Stripe account is properly configured.
          </p>
          <Button onClick={detectTaxRequirements} variant="outline" className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = () => {
    if (requirements.has_existing_registration) return 'bg-green-500';
    if (requirements.registration_required) return 'bg-red-500';
    if (requirements.registration_recommended) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (requirements.has_existing_registration) return 'Tax Setup Complete';
    if (requirements.registration_required) return 'Tax Registration Required';
    if (requirements.registration_recommended) return 'Tax Registration Recommended';
    return 'No Tax Registration Needed';
  };

  return (
    <div className="space-y-6">
      {/* Business Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="text-2xl">{requirements.tax_system.flag}</span>
            <div>
              <div className="flex items-center gap-2">
                {requirements.business_country} Tax Setup
                <Badge variant="outline" className={`${getStatusColor()} text-white border-0`}>
                  {getStatusText()}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Automated {requirements.tax_system.name} configuration for {requirements.business_country} businesses
              </CardDescription>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <Globe className="w-4 h-4" />
                Tax System
              </div>
              <div className="text-lg font-semibold">
                {requirements.tax_system.name} ({requirements.tax_system.rate}%)
              </div>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <CreditCard className="w-4 h-4" />
                Current Revenue
              </div>
              <div className="text-lg font-semibold">
                {new Intl.NumberFormat('en-US', { 
                  style: 'currency', 
                  currency: requirements.tax_system.currency 
                }).format(requirements.current_revenue)}
              </div>
            </div>
            
            {requirements.threshold && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <FileText className="w-4 h-4" />
                  Registration Threshold
                </div>
                <div className="text-lg font-semibold">
                  {new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: requirements.threshold.currency 
                  }).format(requirements.threshold.amount)}
                </div>
              </div>
            )}
          </div>

          {requirements.threshold && requirements.current_revenue > 0 && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Revenue vs. Registration Threshold</span>
                <span>{Math.round((requirements.current_revenue / requirements.threshold.amount) * 100)}%</span>
              </div>
              <Progress 
                value={Math.min(100, (requirements.current_revenue / requirements.threshold.amount) * 100)} 
                className="h-2"
              />
            </div>
          )}

          {/* Tax Setup Status */}
          {requirements.has_existing_registration ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {requirements.tax_system.name} registration is already active for {requirements.business_country}. 
                Your business is ready to collect tax automatically.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant={requirements.registration_required ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {requirements.registration_required
                  ? `Tax registration is required for ${requirements.business_country}. Your revenue has exceeded the registration threshold.`
                  : requirements.registration_recommended
                  ? `Tax registration is recommended for ${requirements.business_country}. You're approaching the registration threshold.`
                  : `Tax registration is not required yet, but you can set it up proactively.`
                }
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Setup Progress */}
      {setupInProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 animate-spin" />
              Setting Up Tax Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={setupProgress} className="mb-4" />
            <div className="space-y-2">
              {setupSteps.map((step, index) => (
                <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  {step.startsWith('✓') ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  ) : step.startsWith('⚠') ? (
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                  ) : (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  {step}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* One-Click Setup Button */}
      {!requirements.has_existing_registration && !setupComplete && (
        <Card>
          <CardHeader>
            <CardTitle>Automated Tax Setup</CardTitle>
            <CardDescription>
              Let our system handle everything automatically. This will:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">1</span>
                </div>
                Create {requirements.tax_system.name} registration in {requirements.business_country}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">2</span>
                </div>
                Automatically classify your services and assign tax codes
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">3</span>
                </div>
                Configure Stripe prices with correct tax behavior
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">4</span>
                </div>
                Validate complete tax compliance setup
              </div>
            </div>

            <Button 
              onClick={runAutomatedSetup}
              disabled={setupInProgress}
              size="lg"
              className="w-full"
            >
              {setupInProgress ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up {requirements.tax_system.name}...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Setup {requirements.tax_system.name} Automatically
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {(requirements.has_existing_registration || setupComplete) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Tax Setup Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requirements.next_steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {step}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};