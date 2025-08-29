import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DepositInfo {
  percentage?: number;
  amount?: number;
  timing: 'now' | 'appointment' | 'days_after';
  days?: number;
}

interface InstallmentPlan {
  type: 'preset' | 'custom';
  preset?: '50_50' | '25_25_50' | 'fixed_deposit';
  deposits?: DepositInfo[];
  fixed_deposit_amount?: number;
}

interface InstallmentSettingsProps {
  installmentsEnabled: boolean;
  defaultPlan: InstallmentPlan;
  onUpdate: (enabled: boolean, plan: InstallmentPlan) => void;
  subscriptionTier?: string;
}

export function InstallmentSettings({ 
  installmentsEnabled, 
  defaultPlan, 
  onUpdate,
  subscriptionTier 
}: InstallmentSettingsProps) {
  const [enabled, setEnabled] = useState(installmentsEnabled);
  const [planType, setPlanType] = useState<'preset' | 'custom'>(defaultPlan.type || 'preset');
  const [preset, setPreset] = useState(defaultPlan.preset || '50_50');
  const [fixedDepositAmount, setFixedDepositAmount] = useState(defaultPlan.fixed_deposit_amount || 50);
  const [customDeposits, setCustomDeposits] = useState<DepositInfo[]>(defaultPlan.deposits || [
    { percentage: 50, timing: 'now' },
    { percentage: 50, timing: 'appointment' }
  ]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const canUseInstallments = subscriptionTier && ['starter', 'professional', 'enterprise'].includes(subscriptionTier);

  const presetPlans = {
    '50_50': { 
      name: '50/50 Split', 
      deposits: [
        { percentage: 50, timing: 'now' as const },
        { percentage: 50, timing: 'appointment' as const }
      ]
    },
    '25_25_50': { 
      name: '25/25/50 Split', 
      deposits: [
        { percentage: 25, timing: 'now' as const },
        { percentage: 25, timing: 'appointment' as const },
        { percentage: 50, timing: 'appointment' as const }
      ]
    },
    'fixed_deposit': { 
      name: 'Fixed Deposit + Remainder', 
      deposits: [] as DepositInfo[]
    }
  };

  const addCustomDeposit = () => {
    setCustomDeposits([...customDeposits, { percentage: 0, timing: 'appointment' }]);
  };

  const removeCustomDeposit = (index: number) => {
    setCustomDeposits(customDeposits.filter((_, i) => i !== index));
  };

  const updateCustomDeposit = (index: number, field: string, value: any) => {
    const updated = [...customDeposits];
    updated[index] = { ...updated[index], [field]: value };
    setCustomDeposits(updated);
  };

  const getTotalPercentage = () => {
    if (planType === 'preset' && preset === 'fixed_deposit') {
      return 100; // Fixed deposit always totals 100%
    }
    if (planType === 'preset') {
      const deposits = presetPlans[preset].deposits;
      return deposits.reduce((sum, d) => sum + (d.percentage || 0), 0);
    }
    return customDeposits.reduce((sum, d) => sum + (d.percentage || 0), 0);
  };

  const isValidPlan = () => {
    const total = getTotalPercentage();
    return total === 100 && customDeposits.length >= 2;
  };

  const handleSave = async () => {
    if (!user) return;

    if (enabled && !isValidPlan()) {
      toast({
        title: "Invalid installment plan",
        description: "Percentages must total 100% and have at least 2 payments.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      let plan: InstallmentPlan;
      
      if (planType === 'preset') {
        if (preset === 'fixed_deposit') {
          plan = {
            type: 'preset',
            preset,
            fixed_deposit_amount: fixedDepositAmount,
            deposits: [
              { amount: fixedDepositAmount, timing: 'now' },
              { timing: 'appointment' } // Remainder calculated dynamically
            ]
          };
        } else {
          plan = {
            type: 'preset',
            preset,
            deposits: presetPlans[preset].deposits
          };
        }
      } else {
        plan = {
          type: 'custom',
          deposits: customDeposits
        };
      }

      const { error } = await supabase
        .from('users')
        .update({
          installments_enabled: enabled,
          default_installment_plan: plan as any
        })
        .eq('id', user.id);

      if (error) throw error;

      onUpdate(enabled, plan);
      toast({
        title: "Installment settings saved",
        description: "Your installment payment configuration has been updated."
      });
    } catch (error) {
      console.error('Error saving installment settings:', error);
      toast({
        title: "Error saving settings",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canUseInstallments) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Installment Payments</CardTitle>
          <CardDescription>
            Split service payments into multiple parts for your customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Installment payments are available for Starter tier and above.
            </p>
            <Badge variant="outline">Upgrade Required</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Installment Payments
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </CardTitle>
        <CardDescription>
          Allow customers to pay for services in multiple installments via WhatsApp payment links.
        </CardDescription>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium">Default Plan Type</Label>
            <RadioGroup value={planType} onValueChange={(value: 'preset' | 'custom') => setPlanType(value)} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="preset" id="preset" />
                <Label htmlFor="preset">Use Preset Plan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Create Custom Plan</Label>
              </div>
            </RadioGroup>
          </div>

          {planType === 'preset' && (
            <div>
              <Label className="text-base font-medium">Choose Preset</Label>
              <RadioGroup value={preset} onValueChange={(value: any) => setPreset(value)} className="mt-2">
                {Object.entries(presetPlans).map(([key, plan]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <RadioGroupItem value={key} id={key} />
                    <Label htmlFor={key} className="flex-1">
                      {plan.name}
                      {key !== 'fixed_deposit' && (
                        <div className="text-sm text-muted-foreground">
                          {plan.deposits.map(d => `${d.percentage}%`).join(' + ')}
                        </div>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {preset === 'fixed_deposit' && (
                <div className="mt-4">
                  <Label htmlFor="deposit-amount">Fixed Deposit Amount (€)</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    value={fixedDepositAmount}
                    onChange={(e) => setFixedDepositAmount(Number(e.target.value))}
                    min="1"
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Remainder will be due at appointment
                  </p>
                </div>
              )}
            </div>
          )}

          {planType === 'custom' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-medium">Custom Payment Schedule</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomDeposit}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment
                </Button>
              </div>

              <div className="space-y-3">
                {customDeposits.map((deposit, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm">Payment {index + 1}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          value={deposit.percentage}
                          onChange={(e) => updateCustomDeposit(index, 'percentage', Number(e.target.value))}
                          min="0"
                          max="100"
                          className="w-20"
                        />
                        <span className="text-sm">%</span>
                      </div>
                    </div>

                    <div className="flex-1">
                      <Label className="text-sm">Due</Label>
                      <select
                        value={deposit.timing}
                        onChange={(e) => updateCustomDeposit(index, 'timing', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                      >
                        <option value="now">Due Now</option>
                        <option value="appointment">At Appointment</option>
                        <option value="days_after">Days After Booking</option>
                      </select>
                    </div>

                    {deposit.timing === 'days_after' && (
                      <div>
                        <Label className="text-sm">Days</Label>
                        <Input
                          type="number"
                          value={deposit.days || 1}
                          onChange={(e) => updateCustomDeposit(index, 'days', Number(e.target.value))}
                          min="1"
                          className="w-20 mt-1"
                        />
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomDeposit(index)}
                      disabled={customDeposits.length <= 2}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <span className="font-medium">Total:</span>
                <Badge variant={getTotalPercentage() === 100 ? 'default' : 'destructive'}>
                  {getTotalPercentage()}%
                </Badge>
              </div>
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>How it works:</strong> When customers choose installments, they'll see a clear payment schedule. 
              Payment links are sent via WhatsApp for each step. No card details are stored.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving || (enabled && !isValidPlan())}>
            {saving ? 'Saving...' : 'Save Installment Settings'}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}