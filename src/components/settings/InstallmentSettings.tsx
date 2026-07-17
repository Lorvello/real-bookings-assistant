import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { ServiceTypeInstallmentCard } from './ServiceTypeInstallmentCard';
import type {
  InstallmentServiceConfig,
  InstallmentSettings as PersistedInstallmentSettings,
} from '@/hooks/useInstallmentSettings';

interface DepositInfo {
  percentage?: number;
  amount?: number;
  timing: 'now' | 'appointment';
}

interface InstallmentPlan {
  type: 'preset' | 'custom';
  preset?: '100_at_booking' | '50_50' | 'fixed_deposit';
  deposits?: DepositInfo[];
  fixed_deposit_amount?: number;
}

interface ServiceTypeInstallmentSettings {
  enabled: boolean;
  plan: InstallmentPlan;
  allowCustomerChoice: boolean;
}

interface InstallmentSettingsProps {
  installmentsEnabled: boolean;
  defaultPlan: InstallmentPlan;
  allowCustomerChoice: boolean;
  applyToServices: 'all' | 'selected';
  selectedServices: string[];
  serviceConfigs: InstallmentServiceConfig[];
  onUpdate: (settingsData: PersistedInstallmentSettings) => Promise<boolean>;
  subscriptionTier?: string;
}

export function InstallmentSettings({ 
  installmentsEnabled, 
  defaultPlan, 
  allowCustomerChoice,
  applyToServices: initialApplyToServices,
  selectedServices: initialSelectedServices,
  serviceConfigs,
  onUpdate,
  subscriptionTier 
}: InstallmentSettingsProps) {
  // Note: enabled state is now managed by parent component via installmentsEnabled prop
  const [planType, setPlanType] = useState<'preset' | 'custom'>(defaultPlan.type || 'preset');
  const [presetSelection, setPresetSelection] = useState(defaultPlan.preset || '100_at_booking');
  const [fixedDepositAmount, setFixedDepositAmount] = useState(defaultPlan.fixed_deposit_amount || 50);
  const [customDeposits, setCustomDeposits] = useState<DepositInfo[]>(defaultPlan.deposits || [
    { percentage: 50, timing: 'now' },
    { percentage: 50, timing: 'appointment' }
  ]);
  const [applyToServices, setApplyToServices] = useState<'all' | 'selected'>(initialApplyToServices);
  const [selectedServices, setSelectedServices] = useState<string[]>(initialSelectedServices);
  const [serviceTypeSettings, setServiceTypeSettings] = useState<Record<string, ServiceTypeInstallmentSettings>>(
    () => Object.fromEntries(serviceConfigs.map((config) => [config.serviceTypeId, {
      enabled: config.enabled,
      plan: config.plan,
      allowCustomerChoice: config.allowCustomerChoice,
    }])),
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation('settings');
  const { selectedCalendar } = useCalendarContext();
  const { serviceTypes } = useServiceTypes(undefined, true); // Load all service types

  // The settings arrive asynchronously from the service-only read endpoint. Hydrate every
  // persisted field when that canonical snapshot changes; otherwise the editor permanently
  // keeps its first-render defaults and a saved selected-services scope reopens as "all".
  useEffect(() => {
    setPlanType(defaultPlan.type || 'preset');
    setPresetSelection(defaultPlan.preset || '100_at_booking');
    setFixedDepositAmount(defaultPlan.fixed_deposit_amount || 50);
    setCustomDeposits(defaultPlan.deposits || [
      { percentage: 50, timing: 'now' },
      { percentage: 50, timing: 'appointment' },
    ]);
    setApplyToServices(initialApplyToServices);
    setSelectedServices(initialSelectedServices);
    setServiceTypeSettings(Object.fromEntries(serviceConfigs.map((config) => [
      config.serviceTypeId,
      {
        enabled: config.enabled,
        plan: config.plan,
        allowCustomerChoice: config.allowCustomerChoice,
      },
    ])));
  }, [
    defaultPlan,
    initialApplyToServices,
    initialSelectedServices,
    serviceConfigs,
  ]);

  const canUseInstallments = subscriptionTier && ['professional', 'enterprise'].includes(subscriptionTier);

  const presetPlans = {
    '100_at_booking': {
      name: t('settings.payments.installments.presets.fullAtBooking.name', '100% at Booking'),
      description: t('settings.payments.installments.presets.fullAtBooking.description', 'Full payment upfront at time of booking'),
      deposits: [
        { percentage: 100, timing: 'now' as const }
      ]
    },
    '50_50': {
      name: t('settings.payments.installments.presets.split5050.name', '50/50 Split'),
      description: t('settings.payments.installments.presets.split5050.description', '50% at booking, 50% on location'),
      deposits: [
        { percentage: 50, timing: 'now' as const },
        { percentage: 50, timing: 'appointment' as const }
      ]
    },
    'fixed_deposit': {
      name: t('settings.payments.installments.presets.fixedDeposit.name', 'Fixed Deposit Plus Remaining'),
      description: t('settings.payments.installments.presets.fixedDeposit.description', 'Fixed amount at booking, rest on location'),
      deposits: [] as DepositInfo[]
    }
  };

  const addCustomDeposit = () => {
    // Find the next appropriate timing
    const hasAtBooking = customDeposits.some(d => d.timing === 'now');
    const hasOnLocation = customDeposits.some(d => d.timing === 'appointment');
    
    if (hasAtBooking && hasOnLocation) return;

    let defaultTiming: 'now' | 'appointment' = 'appointment';
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

  const updateCustomDeposit = <Field extends keyof DepositInfo>(
    index: number,
    field: Field,
    value: DepositInfo[Field],
  ) => {
    const updated = [...customDeposits];
    updated[index] = { ...updated[index], [field]: value };
    
    setCustomDeposits(updated);
  };

  const getAvailableTimingOptions = (currentIndex: number) => {
    const hasAtBooking = customDeposits.some((d, i) => d.timing === 'now' && i !== currentIndex);
    const hasOnLocation = customDeposits.some((d, i) => d.timing === 'appointment' && i !== currentIndex);
    const currentTiming = customDeposits[currentIndex]?.timing;
    
    return [
      {
        value: 'now',
        label: t('settings.payments.installments.timing.atBooking', 'At Booking'),
        disabled: hasAtBooking && currentTiming !== 'now'
      },
      {
        value: 'appointment',
        label: t('settings.payments.installments.timing.onLocation', 'On Location'),
        disabled: hasOnLocation && currentTiming !== 'appointment'
      },
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
           customDeposits.length === 2 &&
           hasAtBooking && 
           atBookingCount === 1 && 
           onLocationCount === 1;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const plan: InstallmentPlan = planType === 'preset' 
        ? { 
            type: 'preset', 
            preset: presetSelection,
            ...(presetSelection === 'fixed_deposit' && { fixed_deposit_amount: fixedDepositAmount })
          }
        : { 
            type: 'custom', 
            deposits: customDeposits 
          };

      const settingsData = {
        enabled: installmentsEnabled, // Use prop instead of local state
        allowCustomerChoice,
        defaultPlan: plan,
        applyToServices,
        selectedServices: applyToServices === 'selected' ? selectedServices : undefined,
        serviceConfigs: applyToServices === 'selected' 
          ? selectedServices.map(serviceId => ({
              serviceTypeId: serviceId,
              enabled: serviceTypeSettings[serviceId]?.enabled ?? true,
              plan: serviceTypeSettings[serviceId]?.plan ?? plan,
              allowCustomerChoice: serviceTypeSettings[serviceId]?.allowCustomerChoice ?? allowCustomerChoice,
            }))
          : undefined
      };

      const success = await onUpdate(settingsData);
      if (success) {
        // Success handled by the hook
      }
    } catch (error) {
      console.error('Error saving installment settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 border border-border/50 rounded-lg">
      {/* Configuration content - parent manages enabled state */}
      <div className="space-y-6">
              <div className="space-y-6">
                <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-3 text-sm text-muted-foreground">
                  {t(
                    'settings.payments.installments.channelScopeNotice',
                    'Current scope: installment plans apply to WhatsApp bookings. The configured first payment is required online; the remainder is recorded on-site after it is actually received. The public booking page uses full online payment when upfront payment is required, or confirms without online payment when it is optional. No later payment is collected automatically.',
                  )}
                </div>
                {/* Apply to Services Section */}
                <div className="space-y-3">
                  <Label className="text-base font-medium text-foreground">{t('settings.payments.installments.applyToServices', 'Apply to Services')}</Label>
                  <RadioGroup
                    value={applyToServices}
                    onValueChange={(value: 'all' | 'selected') => setApplyToServices(value)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all-services" />
                      <Label htmlFor="all-services" className="text-sm font-medium text-foreground">{t('settings.payments.installments.enableAllServices', 'Enable for All Service Types')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="selected" id="selected-services" />
                      <Label htmlFor="selected-services" className="text-sm font-medium text-foreground">{t('settings.payments.installments.choosePerService', 'Choose per Service Type')}</Label>
                    </div>
                  </RadioGroup>

                  {applyToServices === 'selected' && (
                    <div className="mt-4 space-y-3">
                      <Label className="text-sm font-medium text-foreground">{t('settings.payments.installments.selectServiceTypes', 'Select Service Types')}</Label>
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
                                       enabled: true,
                                       allowCustomerChoice,
                                       plan: {
                                         type: 'preset',
                                         preset: '100_at_booking'
                                       }
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
                              className="rounded border-white/[0.15]"
                            />
                            <Label htmlFor={`service-${service.id}`} className="text-sm font-medium cursor-pointer">
                              {service.name}
                            </Label>
                            <Badge variant="outline" className="text-xs">
                              {service.price ? `€${service.price}` : t('settings.payments.installments.free', 'Free')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      {serviceTypes.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          {t('settings.payments.installments.noServiceTypes', 'No service types found. Create service types first to configure installments.')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Service Type Configuration - Only show when per-service is selected and services are chosen */}
                {applyToServices === 'selected' && selectedServices.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-base font-medium text-foreground">{t('settings.payments.installments.configureSelected', 'Configure Selected Service Types')}</Label>
                    <div className="space-y-4">
                      {selectedServices.map((serviceId) => {
                        const service = serviceTypes.find(s => s.id === serviceId);
                        if (!service) return null;
                        
                        const currentPlan = serviceTypeSettings[serviceId]?.plan || {
                          type: 'preset',
                          preset: '100_at_booking'
                        };

                        return (
                          <ServiceTypeInstallmentCard
                            key={serviceId}
                            serviceType={service}
                            plan={currentPlan}
                            onPlanChange={(id, plan) => {
                              setServiceTypeSettings(prev => ({
                                ...prev,
                                [id]: {
                                  enabled: prev[id]?.enabled ?? true,
                                  allowCustomerChoice: prev[id]?.allowCustomerChoice ?? allowCustomerChoice,
                                  plan: plan
                                }
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
                      <Label className="text-base font-medium text-foreground">{t('settings.payments.installments.paymentStructure', 'Payment Structure')}</Label>
                      <RadioGroup
                        value={planType}
                        onValueChange={(value: 'preset' | 'custom') => setPlanType(value)}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="preset" id="preset" />
                          <Label htmlFor="preset" className="text-sm font-medium text-foreground">{t('settings.payments.installments.quickSetup', 'Quick Setup Options')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="custom" />
                          <Label htmlFor="custom" className="text-sm font-medium text-foreground">{t('settings.payments.installments.advancedCustom', 'Advanced Custom Configuration')}</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {planType === 'preset' && (
                      <div className="space-y-4">
                        <Label className="text-base font-medium text-foreground">{t('settings.payments.installments.choosePlan', 'Choose Payment Plan')}</Label>
                        <RadioGroup
                          value={presetSelection}
                          onValueChange={(value: '100_at_booking' | '50_50' | 'fixed_deposit') => setPresetSelection(value)}
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
                            <Label className="text-sm font-medium text-foreground">{t('settings.payments.installments.fixedDepositAmount', 'Fixed Deposit Amount (€)')}</Label>
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
                          <Label className="text-base font-medium text-foreground">{t('settings.payments.installments.customSchedule', 'Custom Payment Schedule')}</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addCustomDeposit}
                            disabled={customDeposits.length >= 2}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {t('settings.payments.installments.addPayment', 'Add Payment')}
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {customDeposits.map((deposit, index) => (
                            <div key={index} className="flex items-center gap-3 p-4 border rounded-lg">
                              <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-sm font-medium text-foreground">{t('settings.payments.installments.percentage', 'Percentage')}</Label>
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
                                    <Label className="text-sm font-medium text-foreground">{t('settings.payments.installments.when', 'When')}</Label>
                                    <Select
                                      value={deposit.timing}
                                      onValueChange={(value) => updateCustomDeposit(
                                        index,
                                        'timing',
                                        value as DepositInfo['timing'],
                                      )}
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
                          <span className="text-sm font-medium">{t('settings.payments.installments.total', 'Total:')}</span>
                          <Badge variant={getTotalPercentage() === 100 ? 'default' : 'destructive'}>
                            {getTotalPercentage()}%
                          </Badge>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                <Button onClick={handleSave} disabled={saving || !isValidPlan()} className="w-full">
                  {saving ? t('settings.payments.installments.savingInstallments', 'Saving...') : t('settings.payments.installments.saveInstallments', 'Save Installment Settings')}
                </Button>
              </div>
      </div>
    </div>
  );
}
