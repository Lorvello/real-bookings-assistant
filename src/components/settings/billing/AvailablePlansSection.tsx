import React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Check } from 'lucide-react';

export interface PlanTile {
  id: string;
  tierName: string;
  displayName: string;
  /** Pre-formatted price, e.g. "€30" or "Starting at €300". */
  displayPrice: string;
  /** e.g. "/month". */
  billingText: string;
  /** Sub-line, e.g. "Billed annually (€288/year)". */
  savingsText?: string;
  features: string[];
  isCurrent: boolean;
  isEnterprise: boolean;
  /** Colour the price emerald (yearly, non-enterprise) for a saving cue. */
  highlightPrice?: boolean;
}

interface AvailablePlansSectionProps {
  plans: PlanTile[];
  billingCycle: 'monthly' | 'yearly';
  onCycleChange: (cycle: 'monthly' | 'yearly') => void;
  onUpgrade: (tierName: string) => void;
  onContactSales: () => void;
  loading?: boolean;
}

/**
 * Available plans — even-height pricing tiles with the current plan emerald-ringed,
 * and a Monthly/Yearly cycle toggle living in the section header action. Pure props.
 */
export function AvailablePlansSection({
  plans,
  billingCycle,
  onCycleChange,
  onUpgrade,
  onContactSales,
  loading,
}: AvailablePlansSectionProps) {
  const { t } = useTranslation('settings');
  return (
    <div id="available-plans" className="scroll-mt-8">
      <SettingsSection
        icon={Sparkles}
        title={t('settings.billing.availablePlans.title', 'Available plans')}
        description={t('settings.billing.availablePlans.description', 'Choose the plan that best fits your needs.')}
        action={
          <div className="flex items-center gap-3">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
              {t('settings.billing.billingCycleToggle.monthly', 'Monthly')}
            </span>
            <Switch
              checked={billingCycle === 'yearly'}
              onCheckedChange={(checked) => onCycleChange(checked ? 'yearly' : 'monthly')}
              aria-label={t('settings.billing.billingCycleToggle.ariaLabel', 'Toggle yearly billing')}
            />
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>
              {t('settings.billing.billingCycleToggle.yearly', 'Yearly')}
            </span>
            {billingCycle === 'yearly' && (
              <Badge className="border-success/20 bg-success/10 text-success-foreground">{t('settings.billing.billingCycleToggle.savings', 'Save 20%')}</Badge>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-xl border p-6 transition-colors ${
                tier.isCurrent
                  ? 'border-primary/40 bg-primary/[0.04] shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]'
                  : 'border-white/[0.06] bg-white/[0.012] hover:border-white/[0.12]'
              }`}
            >
              {tier.isCurrent && (
                <Badge className="absolute -top-2.5 left-6 bg-primary text-primary-foreground">{t('settings.billing.planCard.currentPlan', 'Current plan')}</Badge>
              )}

              <div className="mb-5 text-center">
                <h4 className="mb-2 text-lg font-semibold capitalize text-foreground">{tier.displayName}</h4>
                <div
                  className={`text-3xl font-bold tracking-[-0.02em] ${
                    tier.highlightPrice ? 'text-success-foreground' : 'text-foreground'
                  }`}
                >
                  {tier.displayPrice}
                  <span className="text-sm font-normal text-muted-foreground">{tier.billingText}</span>
                </div>
                {tier.savingsText && <p className="mt-2 text-sm text-muted-foreground">{tier.savingsText}</p>}
              </div>

              <div className="mb-6 flex-1 space-y-2.5">
                {tier.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
                    <span className="text-sm leading-5 text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {tier.isEnterprise ? (
                <Button className="w-full" variant="outline" onClick={onContactSales} disabled={loading}>
                  {t('settings.billing.planCard.contactSales', 'Contact sales')}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={tier.isCurrent ? 'outline' : 'default'}
                  disabled={tier.isCurrent || loading}
                  onClick={() => onUpgrade(tier.tierName)}
                >
                  {loading ? t('settings.billing.planCard.loading', 'Loading…') : tier.isCurrent ? t('settings.billing.planCard.currentPlan', 'Current plan') : t('settings.billing.planCard.switchTo', 'Switch to {{displayName}}', { displayName: tier.displayName })}
                </Button>
              )}
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
