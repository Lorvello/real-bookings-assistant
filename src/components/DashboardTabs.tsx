
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './dashboard-tabs/OverviewTab';
import { BusinessIntelligenceTab } from './dashboard-tabs/BusinessIntelligenceTab';
import { PerformanceEfficiencyTab } from './dashboard-tabs/PerformanceEfficiencyTab';
import { LiveOperationsTab } from './dashboard-tabs/LiveOperationsTab';
import { FutureInsightsTab } from './dashboard-tabs/FutureInsightsTab';
import { AccessBlockedOverlay } from './user-status/AccessBlockedOverlay';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { DateRange } from '@/utils/dateRangePresets';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { 
  LayoutDashboard,
  TrendingUp, 
  Activity, 
  Radio, 
  Brain,
  Lock
} from 'lucide-react';

interface DashboardTabsProps {
  calendarIds: string[];
  dateRange: DateRange;
  onTabChange?: (tab: string) => void;
}

export function DashboardTabs({ calendarIds, dateRange, onTabChange }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { checkAccess } = useAccessControl();
  const { userStatus } = useUserStatus();

  const handleTabChange = (value: string) => {
    // Restricted (Pro) tabs still switch: their TabsContent renders the
    // AccessBlockedOverlay with its upgrade CTA. Previously an early return after
    // a transient toast meant setActiveTab never ran, so the upgrade overlay (the
    // conversion driver) was unreachable dead code — only the toast showed. The
    // per-tab access gate + lock badge live in the TabsContent/TabsTrigger.
    setActiveTab(value);
    onTabChange?.(value);
  };

  const handleUpgrade = () => {
    setShowSubscriptionModal(true);
  };

  const hasBusinessIntelligenceAccess = checkAccess('canAccessBusinessIntelligence');
  const hasPerformanceAccess = checkAccess('canAccessPerformance');
  const hasFutureInsightsAccess = checkAccess('canAccessFutureInsights');

  // Premium underline tabs (one accent) — replaces the old 5-color pill bar.
  const triggerClass =
    'relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none';
  const proBadgeClass =
    'ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground ring-1 ring-primary/20';

  return (
    <div className="space-y-6">
      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto">
          <TabsList className="flex h-auto w-max min-w-full justify-start gap-1 rounded-none border-b border-white/[0.06] bg-transparent p-0 md:w-full">
            <TabsTrigger
              value="overview"
              className={triggerClass}
            >
              <LayoutDashboard className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm whitespace-nowrap">Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="live-operations"
              className={triggerClass}
            >
              <Radio className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm whitespace-nowrap">Live Operations</span>
            </TabsTrigger>
            <TabsTrigger
              value="business-intelligence"
              className={`${triggerClass} ${!hasBusinessIntelligenceAccess ? 'opacity-70' : ''}`}
            >
              {hasBusinessIntelligenceAccess ? (
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="text-xs md:text-sm whitespace-nowrap">Business Intelligence</span>
              {!hasBusinessIntelligenceAccess && <span className={proBadgeClass}>Pro</span>}
            </TabsTrigger>
            <TabsTrigger
              value="performance-efficiency"
              className={`${triggerClass} ${!hasPerformanceAccess ? 'opacity-70' : ''}`}
            >
              {hasPerformanceAccess ? (
                <Activity className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="text-xs md:text-sm whitespace-nowrap">Performance</span>
              {!hasPerformanceAccess && <span className={proBadgeClass}>Pro</span>}
            </TabsTrigger>
            <TabsTrigger
              value="future-insights"
              className={`${triggerClass} ${!hasFutureInsightsAccess ? 'opacity-70' : ''}`}
            >
              {hasFutureInsightsAccess ? (
                <Brain className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="text-xs md:text-sm whitespace-nowrap">Future Insights</span>
              {!hasFutureInsightsAccess && <span className={proBadgeClass}>Pro</span>}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="overview">
          <div className="surface-raised rounded-xl p-0.5 md:p-6">
            <OverviewTab calendarIds={calendarIds} />
          </div>
        </TabsContent>

        <TabsContent value="business-intelligence">
          <div className="surface-raised rounded-xl p-0.5 md:p-6">
            {hasBusinessIntelligenceAccess ? (
              <BusinessIntelligenceTab 
                calendarIds={calendarIds}
                dateRange={dateRange}
              />
            ) : (
              <AccessBlockedOverlay
                userStatus={{ 
                  userType: 'trial',
                  statusMessage: 'Business Intelligence is only available for Professional and Enterprise subscriptions'
                } as any}
                feature="Business Intelligence"
                description="Get access to advanced business metrics, revenue analytics and service performance to grow your business."
                onUpgrade={handleUpgrade}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance-efficiency">
          <div className="surface-raised rounded-xl p-0.5 md:p-6">
            {hasPerformanceAccess ? (
              <PerformanceEfficiencyTab 
                calendarIds={calendarIds}
                dateRange={dateRange}
              />
            ) : (
              <AccessBlockedOverlay
                userStatus={{ 
                  userType: 'trial',
                  statusMessage: 'Performance & Efficiency is only available for Professional and Enterprise subscriptions'
                } as any}
                feature="Performance & Efficiency"
                description="Get access to performance metrics, no-show rates, customer satisfaction scores and efficiency analytics."
                onUpgrade={handleUpgrade}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="live-operations">
          <div className="surface-raised rounded-xl p-0.5 md:p-6">
            <LiveOperationsTab calendarIds={calendarIds} />
          </div>
        </TabsContent>

        <TabsContent value="future-insights">
          <div className="surface-raised rounded-xl p-0.5 md:p-6">
            {hasFutureInsightsAccess ? (
              <FutureInsightsTab calendarIds={calendarIds} />
            ) : (
              <AccessBlockedOverlay
                userStatus={{ 
                  userType: 'trial',
                  statusMessage: 'Future Insights is only available for Professional and Enterprise subscriptions'
                } as any}
                feature="Future Insights"
                description="Get access to advanced predictions, seasonal patterns and AI recommendations to grow your business."
                onUpgrade={handleUpgrade}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        userType={userStatus.userType}
      />
    </div>
  );
}
