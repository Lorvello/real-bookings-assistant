
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './dashboard-tabs/OverviewTab';
import { BusinessIntelligenceTab } from './dashboard-tabs/BusinessIntelligenceTab';
import { PerformanceEfficiencyTab } from './dashboard-tabs/PerformanceEfficiencyTab';
import { LiveOperationsTab } from './dashboard-tabs/LiveOperationsTab';
import { FutureInsightsTab } from './dashboard-tabs/FutureInsightsTab';
import { LockedTabPanel } from './dashboard-tabs/LockedTabPanel';
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
        {/* Horizontal tab scroll on mobile: a right-edge fade hints there are more
            tabs (the Pro tabs) past the viewport — fixes the iOS "Pro tabs
            undiscovered" wart (EINDRAPPORT C7). Hidden on md+ where all tabs fit. */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent md:hidden"
          />
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              <LockedTabPanel
                feature="Business Intelligence"
                description="Advanced business metrics, revenue analytics and service performance to grow your business."
                bullets={['Revenue & service analytics', 'Top-performing services', 'Growth trends over time']}
                icon={TrendingUp}
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
              <LockedTabPanel
                feature="Performance & Efficiency"
                description="Performance metrics, no-show rates, customer satisfaction and efficiency analytics."
                bullets={['No-show & efficiency rates', 'Peak-hour analysis', 'Customer satisfaction scores']}
                icon={Activity}
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
              <LockedTabPanel
                feature="Future Insights"
                description="Advanced predictions, seasonal patterns and AI recommendations to grow your business."
                bullets={['Demand forecasting', 'Seasonal booking patterns', 'AI growth recommendations']}
                icon={Brain}
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
