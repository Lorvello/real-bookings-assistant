import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Globe, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AutoTaxServiceCreationProps {
  calendarId: string;
  onServiceCreated?: (service: any) => void;
}

export const AutoTaxServiceCreation: React.FC<AutoTaxServiceCreationProps> = ({
  calendarId,
  onServiceCreated
}) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const { toast } = useToast();

  const createServiceWithAutoTax = async (serviceData: any) => {
    setLoading(true);
    setProgress(0);
    
    try {
      setCurrentStep('Detecting business location...');
      setProgress(20);

      // Call the enhanced create-service-type-with-stripe function
      const { data, error } = await supabase.functions.invoke('create-service-type-with-stripe', {
        body: {
          serviceData: {
            ...serviceData,
            calendar_id: calendarId,
            tax_enabled: false, // Let the system auto-assign
          },
          testMode: true // Start with test mode
        }
      });

      if (error) throw error;

      setCurrentStep('Auto-assigning tax codes...');
      setProgress(60);

      setCurrentStep('Creating Stripe integration...');
      setProgress(80);

      setCurrentStep('Finalizing service setup...');
      setProgress(100);

      toast({
        title: "Service Created Successfully",
        description: `${serviceData.name} is now ready with automatic tax configuration`,
      });

      if (onServiceCreated) {
        onServiceCreated(data.service);
      }

    } catch (error: any) {
      console.error('Error creating service with auto tax:', error);
      toast({
        title: "Service Creation Failed",
        description: error.message || "Failed to create service with automatic tax setup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress(0);
      setCurrentStep('');
    }
  };

  const handleQuickServiceCreation = () => {
    const sampleService = {
      name: "Consultation",
      description: "Professional consultation service",
      duration: 60,
      price: 75,
      service_category: "consultation",
      color: "#3B82F6"
    };

    createServiceWithAutoTax(sampleService);
  };

  return (
    <Card className="border-gradient">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle>Smart Service Creation</CardTitle>
        </div>
        <CardDescription>
          Create services with automatic international tax configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{currentStep}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Auto country detection</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">Smart tax assignment</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-500" />
            <span className="text-sm">Instant Stripe setup</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleQuickServiceCreation}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>Creating Service...</>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Quick Setup Demo
              </>
            )}
          </Button>
          
          <Badge variant="secondary" className="self-center">
            International Ready
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3 inline mr-1" />
          Tax rates automatically configured based on your business location and service type
        </div>
      </CardContent>
    </Card>
  );
};