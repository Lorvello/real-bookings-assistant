
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Calendar, CreditCard, Brain, Wrench, Shield, Lock, Calculator, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileTab } from './ProfileTab';
import { AIKnowledgeTab } from './AIKnowledgeTab';
import { CalendarTab } from './CalendarTab';
import { ServicesTab } from './ServicesTab';
import { PaymentSettingsTab } from './PaymentSettingsTab';
import { BillingTab } from './BillingTab';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';


import { SettingsProvider, useSettingsContext } from '@/contexts/SettingsContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { SettingsSkeleton } from './SettingsSkeleton';

// Inner component: lives INSIDE SettingsProvider so it can read the settings data
// and show a cold-load skeleton until the real profile has loaded.
const SettingsTabs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('users');
  const { userStatus } = useUserStatus();
  const { checkAccess } = useAccessControl();
  const { toast } = useToast();
  const { selectedCalendar } = useCalendarContext();
  const { profileData, loadError, isLoading, refetch } = useSettingsContext();

  // Handle tab from URL parameters
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['users', 'knowledge', 'operations', 'services', 'payments', 'billing'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    // Check if trying to access payments tab when setup is incomplete
    if (value === 'payments' && userStatus.isSetupIncomplete) {
      toast({
        title: "Complete Setup First",
        description: "Please complete your profile setup before accessing payment settings.",
        variant: "destructive",
      });
      return; // Don't change the tab
    }
    
    // (Removed the 'tax' Coming-Soon toast branch: the Tax TabsTrigger is
    // `disabled`, so a Radix disabled trigger never fires onValueChange and this
    // branch was unreachable dead code.)

    setActiveTab(value);
    // Clear the URL parameter after navigating
    setSearchParams({});
  };

  // Load failure: never strand the user on an endless skeleton with no Save bar (the
  // old silent-fetch-error path). Show a clear error + retry instead.
  if (loadError && !profileData?.id) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/40 bg-destructive/10 px-6 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-destructive-foreground" />
        <div>
          <p className="text-base font-medium text-foreground">We couldn't load your settings</p>
          <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
        </div>
        <Button onClick={() => refetch()} disabled={isLoading} variant="outline">
          {isLoading ? 'Retrying…' : 'Try again'}
        </Button>
      </div>
    );
  }

  // Cold-load: until the real profile data has arrived (it has an id once fetched),
  // show a skeleton instead of a flash of empty inputs.
  if (!profileData?.id) {
    return <SettingsSkeleton />;
  }

  return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3 md:space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-6 min-w-max gap-1 p-1 md:p-1.5 h-12 md:h-14 rounded-lg border-b-0 bg-white/[0.03] ring-1 ring-white/[0.06]">
              <TabsTrigger value="users" className="flex items-center gap-1 md:gap-2 rounded-md border-b-0 px-2 md:px-4 py-1.5 md:py-3 transition-[background-color,color,box-shadow] duration-150 data-[state=active]:bg-primary/[0.12] data-[state=active]:text-foreground data-[state=active]:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.6)]">
                <User className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Users</span>
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="flex items-center gap-1 md:gap-2 rounded-md border-b-0 px-2 md:px-4 py-1.5 md:py-3 transition-[background-color,color,box-shadow] duration-150 data-[state=active]:bg-primary/[0.12] data-[state=active]:text-foreground data-[state=active]:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.6)]">
                <Brain className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">AI Knowledge</span>
              </TabsTrigger>
              <TabsTrigger value="operations" className="flex items-center gap-1 md:gap-2 rounded-md border-b-0 px-2 md:px-4 py-1.5 md:py-3 transition-[background-color,color,box-shadow] duration-150 data-[state=active]:bg-primary/[0.12] data-[state=active]:text-foreground data-[state=active]:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.6)]">
                <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Operations</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-1 md:gap-2 rounded-md border-b-0 px-2 md:px-4 py-1.5 md:py-3 transition-[background-color,color,box-shadow] duration-150 data-[state=active]:bg-primary/[0.12] data-[state=active]:text-foreground data-[state=active]:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.6)]">
                <Wrench className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Services</span>
              </TabsTrigger>
              <TabsTrigger
                value="payments" 
                className={`relative flex items-center gap-1 md:gap-2 rounded-md border-b-0 px-2 md:px-4 py-1.5 md:py-3 transition-[background-color,color,box-shadow] duration-150 data-[state=active]:bg-primary/[0.12] data-[state=active]:text-foreground data-[state=active]:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.6)] ${
                  userStatus.isSetupIncomplete 
                    ? 'text-muted-foreground cursor-not-allowed' 
                    : ''
                }`}
              >
                <Shield className={`h-3 w-3 md:h-4 md:w-4 ${
                  userStatus.isSetupIncomplete ? 'text-muted-foreground' : ''
                }`} />
                <span className="text-xs md:text-sm">Pay & Book</span>
                {userStatus.isSetupIncomplete && (
                  <Lock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                )}
              </TabsTrigger>
              {/* (Removed the disabled "Tax — Soon" tab: a permanently greyed-out
                  Coming-Soon nav item undermines the premium feel. Re-add when the
                  Tax-compliance tab has real content.) */}
              <TabsTrigger value="billing" className="flex items-center gap-1 md:gap-2 rounded-md border-b-0 px-2 md:px-4 py-1.5 md:py-3 transition-[background-color,color,box-shadow] duration-150 data-[state=active]:bg-primary/[0.12] data-[state=active]:text-foreground data-[state=active]:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.6)]">
                <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Billing</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="space-y-4 md:space-y-6">
            <ProfileTab />
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4 md:space-y-6">
            <AIKnowledgeTab />
          </TabsContent>

          <TabsContent value="operations" className="space-y-4 md:space-y-6">
            <CalendarTab />
          </TabsContent>

          <TabsContent value="services" className="space-y-4 md:space-y-6">
            <ServicesTab />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4 md:space-y-6">
            <PaymentSettingsTab />
          </TabsContent>

          <TabsContent value="billing" className="space-y-4 md:space-y-6">
            <BillingTab />
          </TabsContent>

        </Tabs>
  );
};

export const SettingsLayout = () => {
  return (
    <SettingsProvider>
      {/* Activate dark design tokens for the whole settings subtree. The app never
          mounts a ThemeProvider, so without this `dark` class every token-based
          element here (shadcn <Card>=bg-card, text-foreground, text-muted-foreground,
          border-border) rendered with LIGHT values on the dark gray-900 shell —
          white cards in Operations/Services/Pay&Book and a near-invisible page title.
          Scoping `dark` here (not globally) makes all token elements render dark to
          match the shell, with zero effect on hardcoded gray-* elements or any page
          outside Settings. This is the foundation for migrating the remaining
          gray-hardcoded tabs onto tokens. */}
      <div className="dark min-h-screen bg-background p-2 md:p-8">
        <SimplePageHeader title="Settings" />
        <SettingsTabs />
      </div>
    </SettingsProvider>
  );
};
