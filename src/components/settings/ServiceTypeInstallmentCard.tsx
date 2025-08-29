import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

interface DepositInfo {
  percentage?: number;
  amount?: number;
  timing: 'now' | 'appointment' | 'hours_after';
  hours?: number;
}

interface InstallmentPlan {
  type: 'preset' | 'custom';
  preset?: '100_at_booking' | '50_50' | '25_25_50' | 'fixed_deposit';
  deposits?: DepositInfo[];
  fixed_deposit_amount?: number;
}

interface ServiceType {
  id: string;
  name: string;
  price?: number;
}

interface ServiceTypeInstallmentCardProps {
  serviceType: ServiceType;
  plan: InstallmentPlan;
  onPlanChange: (serviceTypeId: string, plan: InstallmentPlan) => void;
}

export function ServiceTypeInstallmentCard({ 
  serviceType, 
  plan, 
  onPlanChange 
}: ServiceTypeInstallmentCardProps) {
  const [planType, setPlanType] = useState<'preset' | 'custom'>(plan.type || 'preset');
  const [presetSelection, setPresetSelection] = useState(plan.preset || '100_at_booking');
  const [fixedDepositAmount, setFixedDepositAmount] = useState(plan.fixed_deposit_amount || 50);
  const [customDeposits, setCustomDeposits] = useState<DepositInfo[]>(plan.deposits || [
    { percentage: 50, timing: 'now' },
    { percentage: 50, timing: 'appointment' }
  ]);

  const presetPlans = {
    '100_at_booking': {
      name: '100% at Booking',
      description: 'Full payment upfront at time of booking',
      deposits: [
        { percentage: 100, timing: 'now' as const }
      ]
    },
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
        { percentage: 25, timing: 'hours_after' as const, hours: 168 },
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
    const hasAtBooking = customDeposits.some(d => d.timing === 'now');
    const hasOnLocation = customDeposits.some(d => d.timing === 'appointment');
    
    let defaultTiming: 'now' | 'appointment' | 'hours_after' = 'hours_after';
    if (!hasAtBooking) {
      defaultTiming = 'now';
    } else if (!hasOnLocation) {
      defaultTiming = 'appointment';
    }
    
    const newDeposits = [...customDeposits, { timing: defaultTiming }];
    setCustomDeposits(newDeposits);
    updatePlan('custom', newDeposits);
  };

  const removeCustomDeposit = (index: number) => {
    const newDeposits = customDeposits.filter((_, i) => i !== index);
    setCustomDeposits(newDeposits);
    updatePlan('custom', newDeposits);
  };

  const updateCustomDeposit = (index: number, field: string, value: any) => {
    const updated = [...customDeposits];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'timing' && value !== 'hours_after') {
      delete updated[index].hours;
    }
    
    setCustomDeposits(updated);
    updatePlan('custom', updated);
  };

  const updatePlan = (type: 'preset' | 'custom', deposits?: DepositInfo[]) => {
    let newPlan: InstallmentPlan;
    
    if (type === 'preset') {
      if (presetSelection === 'fixed_deposit') {
        newPlan = {
          type: 'preset',
          preset: presetSelection,
          fixed_deposit_amount: fixedDepositAmount,
          deposits: [
            { amount: fixedDepositAmount, timing: 'now' },
            { timing: 'appointment' }
          ]
        };
      } else {
        newPlan = {
          type: 'preset',
          preset: presetSelection,
          deposits: presetPlans[presetSelection].deposits
        };
      }
    } else {
      newPlan = {
        type: 'custom',
        deposits: deposits || customDeposits
      };
    }
    
    onPlanChange(serviceType.id, newPlan);
  };

  const handlePlanTypeChange = (newType: 'preset' | 'custom') => {
    setPlanType(newType);
    updatePlan(newType);
  };

  const handlePresetChange = (newPreset: '100_at_booking' | '50_50' | '25_25_50' | 'fixed_deposit') => {
    setPresetSelection(newPreset);
    updatePlan('preset');
  };

  const handleFixedDepositChange = (amount: number) => {
    setFixedDepositAmount(amount);
    updatePlan('preset');
  };

  const getAvailableTimingOptions = (currentIndex: number) => {
    const hasAtBooking = customDeposits.some((d, i) => d.timing === 'now' && i !== currentIndex);
    const hasOnLocation = customDeposits.some((d, i) => d.timing === 'appointment' && i !== currentIndex);
    const currentTiming = customDeposits[currentIndex]?.timing;
    
    return [
      {
        value: 'now',
        label: 'At Booking',
        disabled: hasAtBooking && currentTiming !== 'now'
      },
      {
        value: 'appointment',
        label: 'On Location',
        disabled: hasOnLocation && currentTiming !== 'appointment'
      },
      {
        value: 'hours_after',
        label: 'Hours After Booking',
        disabled: false
      }
    ];
  };

  const getTotalPercentage = () => {
    if (planType === 'preset' && presetSelection === 'fixed_deposit') {
      return 100;
    }
    if (planType === 'preset') {
      const deposits = presetPlans[presetSelection].deposits;
      return deposits.reduce((sum, d) => sum + (d.percentage || 0), 0);
    }
    return customDeposits.reduce((sum, d) => sum + (d.percentage || 0), 0);
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-foreground">{serviceType.name}</h4>
          <p className="text-xs text-muted-foreground">
            {serviceType.price ? `€${serviceType.price}` : 'Free'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Payment Structure</Label>
        <RadioGroup
          value={planType}
          onValueChange={handlePlanTypeChange}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="preset" id={`preset-${serviceType.id}`} />
            <Label htmlFor={`preset-${serviceType.id}`} className="text-sm font-medium text-foreground">Quick Setup Options</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id={`custom-${serviceType.id}`} />
            <Label htmlFor={`custom-${serviceType.id}`} className="text-sm font-medium text-foreground">Advanced Custom Configuration</Label>
          </div>
        </RadioGroup>
      </div>

      {planType === 'preset' && (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Choose Payment Plan</Label>
          <RadioGroup
            value={presetSelection}
            onValueChange={handlePresetChange}
            className="space-y-3"
          >
            {Object.entries(presetPlans).map(([key, preset]) => (
              <div key={key} className="flex items-start space-x-3 p-3 border rounded-lg">
                <RadioGroupItem 
                  value={key} 
                  id={`${key}-${serviceType.id}`} 
                  className="mt-1" 
                />
                <div className="flex-1">
                  <Label 
                    htmlFor={`${key}-${serviceType.id}`} 
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    {preset.name}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {preset.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>

          {presetSelection === 'fixed_deposit' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Fixed Deposit Amount (€)</Label>
              <Input
                type="number"
                min="1"
                value={fixedDepositAmount}
                onChange={(e) => handleFixedDepositChange(Number(e.target.value))}
                className="w-32"
              />
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
              <Plus className="h-3 w-3 mr-1" />
              Add Payment
            </Button>
          </div>

          <div className="space-y-3">
            {customDeposits.map((deposit, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Percentage</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={deposit.percentage || ''}
                        onChange={(e) => updateCustomDeposit(index, 'percentage', Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">When</Label>
                      <Select
                        value={deposit.timing}
                        onValueChange={(value) => updateCustomDeposit(index, 'timing', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableTimingOptions(index).map((option) => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                              disabled={option.disabled}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {deposit.timing === 'hours_after' && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Hours After Booking</Label>
                      <Input
                        type="number"
                        min="1"
                        value={deposit.hours || ''}
                        onChange={(e) => updateCustomDeposit(index, 'hours', Number(e.target.value))}
                        placeholder="24"
                      />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeCustomDeposit(index)}
                  disabled={customDeposits.length <= 2}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total:</span>
            <Badge variant={getTotalPercentage() === 100 ? "default" : "destructive"}>
              {getTotalPercentage()}%
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}