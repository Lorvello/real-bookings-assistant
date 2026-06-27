import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Calendar, CreditCard, Brain, Wrench, Shield, Lock, AlertCircle, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileTab } from './ProfileTab';
import { AIKnowledgeTab } from './AIKnowledgeTab';
import { CalendarTab } from './CalendarTab';
import { ServicesTab } from './ServicesTab';
import { PaymentSettingsTab } from './PaymentSettingsTab';
import { BillingTab } from './BillingTab';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { cn } from '@/lib/utils';

import { SettingsProvider, useSettingsContext } from '@/contexts/SettingsContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useToast } from '@/hooks/use-toast';
import { SettingsSkeleton } from './SettingsSkeleton';

const VALID_TABS = ['users', 'knowledge', 'operations', 'services', 'payments', 'billing'] as const;
type SettingsTabValue = typeof VALID_TABS[number];

interface NavItem {
  value: SettingsTabValue;
  label: string;
  hint: string;
  icon: LucideIcon;
}

// Two semantic groups read far more organised than a flat 6-across bar — the
// owner's workspace config vs their own account (PREMIUM_DESIGN_PLAYBOOK §6).
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { value: 'knowledge', label: 'AI Knowledge', hint: 'What your assistant knows', icon: Brain },
      { value: 'operations', label: 'Operations', hint: 'Calendars & availability', icon: Calendar },
      { value: 'services', label: 'Services', hint: 'Treatments & pricing', icon: Wrench },
      { value: 'payments', label: 'Pay & Book', hint: 'Online payments', icon: Shield },
    ],
  },
  {
    label: 'Account',
    items: [
      { value: 'users', label: 'Users', hint: 'Profile & team', icon: User },
      { value: 'billing', label: 'Billing', hint: 'Plan & invoices', icon: CreditCard },
    ],
  },
];

type TFn = (key: string, defaultValue: string) => string;

// Display-only localizers for the module-level NAV_GROUPS structure. The `value`
// stays the stable tab sentinel (URL param + logic); only the shown text is localized.
const navLabel = (value: SettingsTabValue, fallback: string, t: TFn): string => {
  switch (value) {
    case 'knowledge': return t('settings.nav.knowledge.label', 'AI Knowledge');
    case 'operations': return t('settings.nav.operations.label', 'Operations');
    case 'services': return t('settings.nav.services.label', 'Services');
    case 'payments': return t('settings.nav.payments.label', 'Pay & Book');
    case 'users': return t('settings.nav.users.label', 'Users');
    case 'billing': return t('settings.nav.billing.label', 'Billing');
    default: return fallback;
  }
};
const navHint = (value: SettingsTabValue, fallback: string, t: TFn): string => {
  switch (value) {
    case 'knowledge': return t('settings.nav.knowledge.hint', 'What your assistant knows');
    case 'operations': return t('settings.nav.operations.hint', 'Calendars & availability');
    case 'services': return t('settings.nav.services.hint', 'Treatments & pricing');
    case 'payments': return t('settings.nav.payments.hint', 'Online payments');
    case 'users': return t('settings.nav.users.hint', 'Profile & team');
    case 'billing': return t('settings.nav.billing.hint', 'Plan & invoices');
    default: return fallback;
  }
};
const groupLabel = (label: string, t: TFn): string =>
  label === 'Workspace' ? t('settings.group.workspace', 'Workspace') : t('settings.group.account', 'Account');

// Inner component: lives INSIDE SettingsProvider so it can read the settings data
// and show a cold-load skeleton until the real profile has loaded.
// Exported (named) so the no-auth visual harness can mount the real shell + tabs
// with a mock SettingsContext (launch-ready-loop §7).
export const SettingsTabs = () => {
  const { t } = useTranslation('settings');
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTabValue>('knowledge');
  const { userStatus } = useUserStatus();
  const { toast } = useToast();
  const { profileData, loadError, isLoading, refetch } = useSettingsContext();

  // Handle tab from URL parameters
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && (VALID_TABS as readonly string[]).includes(tabParam)) {
      setActiveTab(tabParam as SettingsTabValue);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    // Block the payments tab until profile setup is complete.
    if (value === 'payments' && userStatus.isSetupIncomplete) {
      toast({
        title: t('settings.toast.setupTitle', 'Complete setup first'),
        description: t('settings.toast.setupDesc', 'Please complete your profile setup before accessing payment settings.'),
        variant: 'destructive',
      });
      return;
    }
    setActiveTab(value as SettingsTabValue);
    setSearchParams({});
  };

  // Load failure: never strand the user on an endless skeleton with no Save bar (the
  // old silent-fetch-error path). Show a clear error + retry instead.
  if (loadError && !profileData?.id) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-destructive-foreground" />
        <div>
          <p className="text-base font-medium text-foreground">{t('settings.loadError.title', "We couldn't load your settings")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
        </div>
        <Button onClick={() => refetch()} disabled={isLoading} variant="outline">
          {isLoading ? t('settings.loadError.retrying', 'Retrying…') : t('settings.loadError.retry', 'Try again')}
        </Button>
      </div>
    );
  }

  // Cold-load: until the real profile data has arrived (it has an id once fetched),
  // show a skeleton instead of a flash of empty inputs.
  if (!profileData?.id) {
    return <SettingsSkeleton />;
  }

  const triggerClass = (locked: boolean) =>
    cn(
      // Calm left-rail nav item: neutral at rest, white-alpha hover, emerald wash +
      // 2px left bar when active (PLAYBOOK §2c selected system). No movement.
      // min-h-11 md:min-h-0 → the mobile horizontal-scroller nav items are >=44px tall
      // (touch-target, DoD §2); the desktop vertical rail keeps its natural two-line height.
      'group relative mb-0 flex min-h-11 w-full shrink-0 items-center gap-3 rounded-lg border-0 px-3 py-2.5 text-left md:min-h-0',
      'text-sm text-muted-foreground transition-colors duration-150',
      'hover:bg-white/[0.03] hover:text-foreground',
      'data-[state=active]:bg-primary/[0.10] data-[state=active]:text-foreground data-[state=active]:shadow-none',
      locked && 'cursor-not-allowed opacity-70 hover:bg-transparent hover:text-muted-foreground',
    );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} orientation="vertical">
      <div className="flex flex-col gap-5 md:flex-row md:gap-8">
        {/* LEFT NAV — sticky vertical rail on desktop, horizontal scroller on mobile */}
        <aside className="md:w-60 md:shrink-0">
          <div className="md:sticky md:top-6">
            <p className="mb-3 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground md:block">
              {t('settings.railLabel', 'Settings')}
            </p>
            <TabsList className="-mx-1 flex h-auto w-[calc(100%+0.5rem)] items-stretch justify-start gap-1 overflow-x-auto rounded-none border-b-0 bg-transparent p-1 md:mx-0 md:w-full md:flex-col md:gap-1 md:overflow-visible">
              {NAV_GROUPS.map((group, gi) => (
                <React.Fragment key={group.label}>
                  <p
                    aria-hidden="true"
                    className={cn(
                      'hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground md:block',
                      gi > 0 && 'pt-4',
                    )}
                  >
                    {groupLabel(group.label, t)}
                  </p>
                  {group.items.map((item) => {
                    const locked = item.value === 'payments' && userStatus.isSetupIncomplete;
                    const Icon = item.icon;
                    return (
                      <TabsTrigger key={item.value} value={item.value} className={triggerClass(locked)}>
                        <span
                          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity duration-150 group-data-[state=active]:opacity-100"
                          aria-hidden="true"
                        />
                        <Icon className="h-4 w-4 shrink-0 text-subtle-foreground transition-colors group-hover:text-muted-foreground group-data-[state=active]:text-accent-foreground" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium leading-5">{navLabel(item.value, item.label, t)}</span>
                          <span className="hidden truncate text-xs leading-4 text-subtle-foreground md:block">
                            {navHint(item.value, item.hint, t)}
                          </span>
                        </span>
                        {locked && <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-subtle-foreground" />}
                      </TabsTrigger>
                    );
                  })}
                </React.Fragment>
              ))}
            </TabsList>
          </div>
        </aside>

        {/* RIGHT COLUMN — fills the available width (consistent with the full-width
            Availability/Calendar/Dashboard pages), capped only on very wide screens so
            single-column form fields never stretch to an unreadable length.
            pb clears the floating SettingsSaveBar (fixed bottom-0) so the last
            section's content is never covered when there are unsaved changes. */}
        <div className="min-w-0 flex-1 pb-24 md:max-w-4xl xl:max-w-5xl">
          <TabsContent value="users" className="mt-0 focus-visible:outline-none">
            <ProfileTab />
          </TabsContent>
          <TabsContent value="knowledge" className="mt-0 focus-visible:outline-none">
            <AIKnowledgeTab />
          </TabsContent>
          <TabsContent value="operations" className="mt-0 focus-visible:outline-none">
            <CalendarTab />
          </TabsContent>
          <TabsContent value="services" className="mt-0 focus-visible:outline-none">
            <ServicesTab />
          </TabsContent>
          <TabsContent value="payments" className="mt-0 focus-visible:outline-none">
            <PaymentSettingsTab />
          </TabsContent>
          <TabsContent value="billing" className="mt-0 focus-visible:outline-none">
            <BillingTab />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
};

export const SettingsLayout = () => {
  const { t } = useTranslation('settings');
  return (
    <SettingsProvider>
      {/* Activate dark design tokens for the whole settings subtree. The app never
          mounts a ThemeProvider, so without this `dark` class every token-based
          element here would render with LIGHT values on the dark shell. Scoping
          `dark` here (not globally) keeps all token elements dark with zero effect
          on any page outside Settings. */}
      <div className="dark min-h-full bg-background p-3 sm:p-4 md:p-8">
        <div className="w-full">
          <SimplePageHeader title={t('settings.pageTitle', 'Settings')} />
          <div className="mt-6 md:mt-8">
            <SettingsTabs />
          </div>
        </div>
      </div>
    </SettingsProvider>
  );
};
