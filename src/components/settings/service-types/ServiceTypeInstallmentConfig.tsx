import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { ServiceType } from '@/types/database';

interface InstallmentPlan {
  type: 'preset' | 'custom';
  preset?: '50_50' | '25_25_50' | 'fixed_deposit';
  deposits?: Array<{
    percentage?: number;
    amount?: number;
    timing: 'now' | 'appointment' | 'hours_after';
    hours?: number;
  }>;
  fixed_deposit_amount?: number;
}

interface ServiceTypeInstallmentConfigProps {
  serviceType: ServiceType;
  businessInstallmentsEnabled: boolean;
  businessDefaultPlan: InstallmentPlan;
  onUpdate: (updates: Partial<ServiceType>) => void;
}

export function ServiceTypeInstallmentConfig({ 
  serviceType, 
  businessInstallmentsEnabled,
  businessDefaultPlan,
  onUpdate 
}: ServiceTypeInstallmentConfigProps) {
  // null = use business default, true = enabled override, false = disabled override
  const [overrideEnabled, setOverrideEnabled] = useState<boolean | null>(
    (serviceType as any).installments_enabled
  );
  const [customPlan, setCustomPlan] = useState<InstallmentPlan | null>(
    (serviceType as any).custom_installment_plan ? JSON.parse((serviceType as any).custom_installment_plan as string) : null
  );
  const [showCustomPlan, setShowCustomPlan] = useState(!!customPlan);

  if (!businessInstallmentsEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Installment Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Installments are not enabled for your business. Enable them in the Pay & Book settings first.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getEffectiveSettings = () => {
    const enabled = overrideEnabled !== null ? overrideEnabled : businessInstallmentsEnabled;
    const plan = customPlan || businessDefaultPlan;
    return { enabled, plan };
  };

  const handleSave = () => {
    onUpdate({
      installments_enabled: overrideEnabled,
      custom_installment_plan: customPlan ? JSON.stringify(customPlan) : null
    } as any);
  };

  const resetToDefault = () => {
    setOverrideEnabled(null);
    setCustomPlan(null);
    setShowCustomPlan(false);
    onUpdate({
      installments_enabled: null,
      custom_installment_plan: null
    } as any);
  };

  const { enabled, plan } = getEffectiveSettings();
  const hasOverride = overrideEnabled !== null || customPlan !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Service Installment Settings
          {hasOverride && (
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-base font-medium">Override Business Default</Label>
          <div className="flex items-center gap-4 mt-2">
            <Button
              variant={overrideEnabled === null ? "default" : "outline"}
              size="sm"
              onClick={() => setOverrideEnabled(null)}
            >
              Use Business Default
            </Button>
            <Button
              variant={overrideEnabled === true ? "default" : "outline"}
              size="sm"
              onClick={() => setOverrideEnabled(true)}
            >
              Enable
            </Button>
            <Button
              variant={overrideEnabled === false ? "default" : "outline"}
              size="sm"
              onClick={() => setOverrideEnabled(false)}
            >
              Disable
            </Button>
          </div>
        </div>

        {enabled && (
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Payment Plan</Label>
              <Switch
                checked={showCustomPlan}
                onCheckedChange={setShowCustomPlan}
              />
              <span className="text-sm text-muted-foreground">
                {showCustomPlan ? 'Custom Plan' : 'Use Business Default'}
              </span>
            </div>

            {!showCustomPlan && (
              <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  <strong>Using Business Default Plan:</strong> {businessDefaultPlan.preset || 'Custom'}
                </p>
              </div>
            )}

            {showCustomPlan && (
              <div className="mt-4 space-y-4">
                {/* Custom plan configuration similar to InstallmentSettings */}
                <p className="text-sm text-muted-foreground">
                  Create a custom installment plan specific to this service type.
                </p>
                {/* Add custom plan builder here - similar to InstallmentSettings */}
              </div>
            )}
          </div>
        )}

        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-medium">Current Configuration:</span>
            <div className="flex gap-2">
              <Badge variant={enabled ? "default" : "secondary"}>
                {enabled ? "Installments Enabled" : "Installments Disabled"}
              </Badge>
              {hasOverride && (
                <Badge variant="outline">Override Active</Badge>
              )}
            </div>
          </div>
          {enabled && (
            <p className="text-sm text-muted-foreground mt-2">
              Plan: {plan.preset || 'Custom'} • Customers can split payments via WhatsApp
            </p>
          )}
        </div>

        {hasOverride && (
          <Button onClick={handleSave}>
            Save Override Settings
          </Button>
        )}
      </CardContent>
    </Card>
  );
}