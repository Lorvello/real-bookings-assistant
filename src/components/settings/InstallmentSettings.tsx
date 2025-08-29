import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useCalendarContext } from '@/contexts/CalendarContext';

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
  const [presetSelection, setPresetSelection] = useState(defaultPlan.preset || '50_50');
  const [fixedDepositAmount, setFixedDepositAmount] = useState(defaultPlan.fixed_deposit_amount || 50);
  const [customDeposits, setCustomDeposits] = useState<DepositInfo[]>(defaultPlan.deposits || [
    { percentage: 50, timing: 'now' },
    { percentage: 50, timing: 'appointment' }
  ]);
  const [applyToServices, setApplyToServices] = useState<'all' | 'selected'>('all');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedCalendar } = useCalendarContext();
  const { serviceTypes } = useServiceTypes(selectedCalendar?.id);

  const canUseInstallments = subscriptionTier && ['professional', 'enterprise'].includes(subscriptionTier);

  const presetPlans = {
    '50_50': { 
      name: '50/50 Split', 
      description: '50% at booking, 50% on location',
      deposits: [
        { percentage: 50, timing: 'now' as const },
        { percentage: 50, timing: 'appointment' as const }
      ]
    },
    '25_25_50': { 
      name: '25/25/50 Split', 
      description: '25% at booking, 25% 1 week later, 50% on location',
      deposits: [
        { percentage: 25, timing: 'now' as const },
        { percentage: 25, timing: 'days_after' as const, days: 7 },
        { percentage: 50, timing: 'appointment' as const }
      ]
    },
    'fixed_deposit': { 
      name: 'Fixed Deposit Plus Remaining', 
      description: 'Fixed amount at booking, rest on location',
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
    if (planType === 'preset' && presetSelection === 'fixed_deposit') {
      return 100; // Fixed deposit always totals 100%
    }
    if (planType === 'preset') {
      const deposits = presetPlans[presetSelection].deposits;
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
        if (presetSelection === 'fixed_deposit') {
          plan = {
            type: 'preset',
            preset: presetSelection,
            fixed_deposit_amount: fixedDepositAmount,
            deposits: [
              { amount: fixedDepositAmount, timing: 'now' },
              { timing: 'appointment' } // Remainder calculated dynamically
            ]
          };
        } else {
          plan = {
            type: 'preset',
            preset: presetSelection,
            deposits: presetPlans[presetSelection].deposits
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium text-foreground">Installment Payments</h3>
        </div>
      </div>
      <div className="space-y-4">
        {subscriptionTier === 'free' ? (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Upgrade Required
                </p>
                <p className="text-sm text-muted-foreground">
                  Installment payment options are available for Professional plans and above
                </p>
                <Button variant="default" size="sm">
                  Upgrade to Professional
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="installments-enabled" className="text-sm font-medium text-foreground">
                  Enable Installment Payments
                </Label>
                <p className="text-sm text-muted-foreground">
                  Customers can choose to pay in installments instead of full upfront
                </p>
              </div>
              <Switch
                id="installments-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            {enabled && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-base font-medium text-foreground">Payment Structure</Label>
                  <RadioGroup
                    value={planType}
                    onValueChange={(value: 'preset' | 'custom') => setPlanType(value)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="preset" id="preset" />
                      <Label htmlFor="preset" className="text-sm font-medium text-foreground">Quick Setup Options</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label htmlFor="custom" className="text-sm font-medium text-foreground">Advanced Custom Configuration</Label>
                    </div>
                  </RadioGroup>
                </div>

                {planType === 'preset' && (
                  <div className="space-y-4">
                    <Label className="text-base font-medium text-foreground">Choose Payment Plan</Label>
                    <RadioGroup
                      value={presetSelection}
                      onValueChange={(value: '50_50' | '25_25_50' | 'fixed_deposit') => setPresetSelection(value)}
                      className="space-y-4"
                    >
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="50_50" id="50_50" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="50_50" className="text-sm font-medium text-foreground cursor-pointer">
                            {presetPlans['50_50'].name}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {presetPlans['50_50'].description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="25_25_50" id="25_25_50" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="25_25_50" className="text-sm font-medium text-foreground cursor-pointer">
                            {presetPlans['25_25_50'].name}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {presetPlans['25_25_50'].description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="fixed_deposit" id="fixed_deposit" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="fixed_deposit" className="text-sm font-medium text-foreground cursor-pointer">
                            {presetPlans['fixed_deposit'].name}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {presetPlans['fixed_deposit'].description}
                          </p>
                        </div>
                      </div>
                    </RadioGroup>

                    {presetSelection === 'fixed_deposit' && (
                      <div className="mt-4">
                        <Label htmlFor="deposit-amount" className="text-sm font-medium text-foreground">Fixed Deposit Amount (€)</Label>
                        <Input
                          id="deposit-amount"
                          type="number"
                          value={fixedDepositAmount}
                          onChange={(e) => setFixedDepositAmount(Number(e.target.value))}
                          min="1"
                          className="w-32 mt-1"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Remainder will be due on location
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {planType === 'custom' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground">Custom Payment Schedule</Label>
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
                            <Label className="text-sm font-medium">Payment {index + 1}</Label>
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
                            <Label className="text-sm font-medium">Due</Label>
                            <Select
                              value={deposit.timing}
                              onValueChange={(value) => updateCustomDeposit(index, 'timing', value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-background border shadow-md">
                                <SelectItem value="now">At Booking</SelectItem>
                                <SelectItem value="appointment">On Location</SelectItem>
                                <SelectItem value="days_after">Days After Booking</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {deposit.timing === 'days_after' && (
                            <div>
                              <Label className="text-sm font-medium">Days</Label>
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
                      <span className="text-sm font-medium">Total:</span>
                      <Badge variant={getTotalPercentage() === 100 ? 'default' : 'destructive'}>
                        {getTotalPercentage()}%
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Service Type Selection */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-base font-medium text-foreground">Apply To Services</Label>
                  <RadioGroup
                    value={applyToServices}
                    onValueChange={(value: 'all' | 'selected') => setApplyToServices(value)}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all-services" />
                      <Label htmlFor="all-services" className="text-sm font-medium text-foreground">
                        Enable on all services
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="selected" id="selected-services" />
                      <Label htmlFor="selected-services" className="text-sm font-medium text-foreground">
                        Choose per service type
                      </Label>
                    </div>
                  </RadioGroup>

                  {applyToServices === 'selected' && serviceTypes.length > 0 && (
                    <div className="space-y-2 pl-6">
                      {serviceTypes.map((service) => (
                        <div key={service.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`service-${service.id}`}
                            checked={selectedServices.includes(service.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedServices([...selectedServices, service.id]);
                              } else {
                                setSelectedServices(selectedServices.filter(id => id !== service.id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={`service-${service.id}`} className="text-sm text-foreground">
                            {service.name} - €{service.price} ({service.duration}min)
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-muted/30 border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Settings className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">How it works</p>
                      <p className="text-sm text-muted-foreground">
                        Customers see clear payment options during booking. Initial payments are processed via secure WhatsApp payment links. "On location" payments are handled in-person with cash or pin.
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving || (enabled && !isValidPlan())} className="w-full">
                  {saving ? 'Saving...' : 'Save Installment Settings'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}