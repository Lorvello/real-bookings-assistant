
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Calendar, CreditCard, Brain, Wrench, Shield, Lock, Calculator } from 'lucide-react';
import { ProfileTab } from './ProfileTab';
import { AIKnowledgeTab } from './AIKnowledgeTab';
import { CalendarTab } from './CalendarTab';
import { ServicesTab } from './ServicesTab';
import { PaymentSettingsTab } from './PaymentSettingsTab';
import { TaxTab } from './TaxTab';
import { BillingTab } from './BillingTab';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';


import { SettingsProvider } from '@/contexts/SettingsContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useToast } from '@/hooks/use-toast';

export const SettingsLayout = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('users');
  const { userStatus } = useUserStatus();
  const { toast } = useToast();

  // Handle tab from URL parameters
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['users', 'knowledge', 'operations', 'services', 'payments', 'tax', 'billing'].includes(tabParam)) {
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
    
    setActiveTab(value);
    // Clear the URL parameter after navigating
    setSearchParams({});
  };

  return (
    <SettingsProvider>
      <div className="min-h-screen bg-gray-900 p-2 md:p-8">
        <SimplePageHeader title="Settings" />

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3 md:space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-7 bg-gray-800/50 border-gray-700 min-w-max p-1 md:p-2 h-12 md:h-14">
              <TabsTrigger value="users" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <User className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Users</span>
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <Brain className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">AI Knowledge</span>
              </TabsTrigger>
              <TabsTrigger value="operations" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Operations</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <Wrench className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Services</span>
              </TabsTrigger>
              <TabsTrigger 
                value="payments" 
                className={`relative flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3 ${
                  userStatus.isSetupIncomplete 
                    ? 'text-gray-500 cursor-not-allowed' 
                    : ''
                }`}
              >
                <Shield className={`h-3 w-3 md:h-4 md:w-4 ${
                  userStatus.isSetupIncomplete ? 'text-gray-600' : ''
                }`} />
                <span className="text-xs md:text-sm">Pay & Book</span>
                {userStatus.isSetupIncomplete && (
                  <>
                    <Lock className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
                    <Lock className="absolute -top-1 -right-1 h-3 w-3 text-red-400" />
                  </>
                )}
              </TabsTrigger>
              <TabsTrigger value="tax" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
                <Calculator className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Tax</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-1 md:gap-2 data-[state=active]:bg-gray-700 px-2 md:px-4 py-1.5 md:py-3">
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

          <TabsContent value="tax" className="space-y-4 md:space-y-6">
            <TaxTab />
          </TabsContent>

          <TabsContent value="billing" className="space-y-4 md:space-y-6">
            <BillingTab />
          </TabsContent>

        </Tabs>
      </div>
    </SettingsProvider>
  );
};
