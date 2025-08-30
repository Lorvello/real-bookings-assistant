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
import { ServiceTypeInstallmentCard } from './ServiceTypeInstallmentCard';

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
  const [allowCustomerChoice, setAllowCustomerChoice] = useState(true);
  const [planType, setPlanType] = useState<'preset' | 'custom'>(defaultPlan.type || 'preset');
  const [presetSelection, setPresetSelection] = useState(defaultPlan.preset || '100_at_booking');
  const [fixedDepositAmount, setFixedDepositAmount] = useState(defaultPlan.fixed_deposit_amount || 50);
  const [customDeposits, setCustomDeposits] = useState<DepositInfo[]>(defaultPlan.deposits || [
    { percentage: 50, timing: 'now' },
    { percentage: 50, timing: 'appointment' }
  ]);
  const [applyToServices, setApplyToServices] = useState<'all' | 'selected'>('all');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceTypeSettings, setServiceTypeSettings] = useState<Record<string, InstallmentPlan>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedCalendar } = useCalendarContext();
  const { serviceTypes } = useServiceTypes(undefined, true); // Load all service types

  const canUseInstallments = subscriptionTier && ['professional', 'enterprise'].includes(subscriptionTier);

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
        { percentage: 25, timing: 'hours_after' as const, hours: 168 }, // 1 week = 168 hours
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
    // Find the next appropriate timing
    const hasAtBooking = customDeposits.some(d => d.timing === 'now');
    const hasOnLocation = customDeposits.some(d => d.timing === 'appointment');
    
    let defaultTiming: 'now' | 'appointment' | 'hours_after' = 'hours_after';
    if (!hasAtBooking) {
      defaultTiming = 'now';
    } else if (!hasOnLocation) {
      defaultTiming = 'appointment';
    }
    
    setCustomDeposits([...customDeposits, { timing: defaultTiming }]);
  };

  const removeCustomDeposit = (index: number) => {
    setCustomDeposits(customDeposits.filter((_, i) => i !== index));
  };

  const updateCustomDeposit = (index: number, field: string, value: any) => {
    const updated = [...customDeposits];
    updated[index] = { ...updated[index], [field]: value };
    
    // Clear hours when timing changes away from hours_after
    if (field === 'timing' && value !== 'hours_after') {
      delete updated[index].hours;
    }
    
    setCustomDeposits(updated);
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
      return 100; // Fixed deposit always totals 100%
    }
    if (planType === 'preset') {
      const deposits = presetPlans[presetSelection].deposits;
      return deposits.reduce((sum, d) => sum + (d.percentage || 0), 0);
    }
    return customDeposits.reduce((sum, d) => sum + (d.percentage || 0), 0);
  };

  const isValidPlan = () => {
    if (planType === 'preset') return true;
    
    const total = getTotalPercentage();
    const hasAtBooking = customDeposits.some(d => d.timing === 'now');
    const atBookingCount = customDeposits.filter(d => d.timing === 'now').length;
    const onLocationCount = customDeposits.filter(d => d.timing === 'appointment').length;
    
    return total === 100 && 
           customDeposits.length >= 2 && 
           hasAtBooking && 
           atBookingCount === 1 && 
           onLocationCount <= 1;
  };

  const handleSave = async () => {
    if (!user) return;

    if (enabled && planType === 'custom' && !isValidPlan()) {
      const hasAtBooking = customDeposits.some(d => d.timing === 'now');
      const atBookingCount = customDeposits.filter(d => d.timing === 'now').length;
      const onLocationCount = customDeposits.filter(d => d.timing === 'appointment').length;
      
      let errorMessage = "Percentages must total 100% and have at least 2 payments.";
      
      if (!hasAtBooking) {
        errorMessage = "At least one payment must be 'At Booking'.";
      } else if (atBookingCount > 1) {
        errorMessage = "Only one payment can be 'At Booking'.";
      } else if (onLocationCount > 1) {
        errorMessage = "Only one payment can be 'On Location'.";
      }
      
      toast({
        title: "Invalid installment plan",
        description: errorMessage,
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
                  Allow customers to pay for services in multiple installments
                </p>
              </div>
              <Switch
                id="installments-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            {enabled && (
              <div className="space-y-6">
                {/* Allow Customer Choice - New top option */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="allow-customer-choice" className="text-sm font-medium text-foreground">
                      Allow customers to choose
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, customers can choose between your installment plan or paying in full upfront
                    </p>
                  </div>
                  <Switch
                    id="allow-customer-choice"
                    checked={allowCustomerChoice}
                    onCheckedChange={setAllowCustomerChoice}
                  />
                </div>

                {/* Apply to Services Section */}
                <div className="space-y-3">
                  <Label className="text-base font-medium text-foreground">Apply to Services</Label>
                  <RadioGroup
                    value={applyToServices}
                    onValueChange={(value: 'all' | 'selected') => setApplyToServices(value)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all-services" />
                      <Label htmlFor="all-services" className="text-sm font-medium text-foreground">Enable for All Service Types</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="selected" id="selected-services" />
                      <Label htmlFor="selected-services" className="text-sm font-medium text-foreground">Choose per Service Type</Label>
                    </div>
                  </RadioGroup>

                  {applyToServices === 'selected' && (
                    <div className="mt-4 space-y-3">
                      <Label className="text-sm font-medium text-foreground">Select Service Types</Label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {serviceTypes.map((service) => (
                          <div key={service.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <input
                              type="checkbox"
                              id={`service-${service.id}`}
                              checked={selectedServices.includes(service.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedServices([...selectedServices, service.id]);
                                  // Initialize with default plan for new selections
                                  if (!serviceTypeSettings[service.id]) {
                                    setServiceTypeSettings(prev => ({
                                      ...prev,
                                      [service.id]: {
                                        type: 'preset',
                                        preset: '100_at_booking',
                                        deposits: [{ percentage: 100, timing: 'now' }]
                                      }
                                    }));
                                  }
                                } else {
                                  setSelectedServices(selectedServices.filter(id => id !== service.id));
                                  // Remove settings for unselected services
                                  setServiceTypeSettings(prev => {
                                    const updated = { ...prev };
                                    delete updated[service.id];
                                    return updated;
                                  });
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor={`service-${service.id}`} className="text-sm font-medium cursor-pointer">
                              {service.name}
                            </Label>
                            <Badge variant="outline" className="text-xs">
                              {service.price ? `€${service.price}` : 'Free'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      {serviceTypes.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No service types found. Create service types first to configure installments.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Service Type Configuration - Only show when per-service is selected and services are chosen */}
                {applyToServices === 'selected' && selectedServices.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-base font-medium text-foreground">Configure Selected Service Types</Label>
                    <div className="space-y-4">
                      {selectedServices.map((serviceId) => {
                        const service = serviceTypes.find(s => s.id === serviceId);
                        if (!service) return null;
                        
                        const currentPlan = serviceTypeSettings[serviceId] || {
                          type: 'preset',
                          preset: '100_at_booking',
                          deposits: [{ percentage: 100, timing: 'now' }]
                        };

                        return (
                          <ServiceTypeInstallmentCard
                            key={serviceId}
                            serviceType={service}
                            plan={currentPlan}
                            onPlanChange={(id, plan) => {
                              setServiceTypeSettings(prev => ({
                                ...prev,
                                [id]: plan
                              }));
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Payment Structure Section - Only show for "all services" mode, hierarchically under Apply to Services */}
                {applyToServices === 'all' && (
                  <div className="ml-6 border-l-2 border-muted pl-4 space-y-4">
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
                          onValueChange={(value: '100_at_booking' | '50_50' | '25_25_50' | 'fixed_deposit') => setPresetSelection(value)}
                          className="space-y-4"
                        >
                          <div className="flex items-start space-x-3 p-4 border rounded-lg">
                            <RadioGroupItem value="100_at_booking" id="100_at_booking" className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor="100_at_booking" className="text-sm font-medium text-foreground cursor-pointer">
                                {presetPlans['100_at_booking'].name}
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {presetPlans['100_at_booking'].description}
                              </p>
                            </div>
                          </div>
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
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-foreground">Fixed Deposit Amount (€)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={fixedDepositAmount}
                              onChange={(e) => setFixedDepositAmount(Number(e.target.value))}
                              className="w-32"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {planType === 'custom' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium text-foreground">Custom Payment Schedule</Label>
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
                            <div key={index} className="flex items-center gap-3 p-4 border rounded-lg">
                              <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-sm font-medium text-foreground">Percentage</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="100"
                                      value={deposit.percentage || ''}
                                      onChange={(e) => updateCustomDeposit(index, 'percentage', Number(e.target.value))}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-foreground">When</Label>
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
                                    <Label className="text-sm font-medium text-foreground">Hours After Booking</Label>
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

                  </div>
                )}

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