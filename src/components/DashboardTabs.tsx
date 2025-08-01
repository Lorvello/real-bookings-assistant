
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
  const { checkAccess, requireAccess } = useAccessControl();
  const { userStatus } = useUserStatus();

  const handleTabChange = (value: string) => {
    // Check access for restricted tabs
    if (value === 'business-intelligence' && !checkAccess('canAccessBusinessIntelligence')) {
      requireAccess('canAccessBusinessIntelligence');
      return;
    }
    
    if (value === 'performance-efficiency' && !checkAccess('canAccessPerformance')) {
      requireAccess('canAccessPerformance');
      return;
    }
    
    if (value === 'future-insights' && !checkAccess('canAccessFutureInsights')) {
      requireAccess('canAccessFutureInsights');
      return;
    }
    
    setActiveTab(value);
    onTabChange?.(value);
  };

  const handleUpgrade = () => {
    setShowSubscriptionModal(true);
  };

  const hasBusinessIntelligenceAccess = checkAccess('canAccessBusinessIntelligence');
  const hasPerformanceAccess = checkAccess('canAccessPerformance');
  const hasFutureInsightsAccess = checkAccess('canAccessFutureInsights');

  return (
    <div className="space-y-6">
      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto">
          <TabsList className="flex bg-gray-800 h-auto p-1 md:p-2 flex-shrink-0 min-w-max w-max md:w-full md:grid md:grid-cols-5">
            <TabsTrigger 
              value="overview" 
              className="flex items-center justify-center gap-1 md:gap-2 py-2 md:py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-cyan-600 rounded-lg px-2 md:px-4 md:flex-1"
            >
              <LayoutDashboard className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm whitespace-nowrap">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="live-operations" 
              className="flex items-center justify-center gap-1 md:gap-2 py-2 md:py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg px-2 md:px-4 md:flex-1"
            >
              <Radio className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm whitespace-nowrap">Live Operations</span>
            </TabsTrigger>
            <TabsTrigger 
              value="business-intelligence" 
              className={`flex items-center justify-center gap-1 md:gap-2 py-2 md:py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-orange-600 rounded-lg px-2 md:px-4 md:flex-1 ${
                !hasBusinessIntelligenceAccess ? 'opacity-60' : ''
              }`}
            >
              {hasBusinessIntelligenceAccess ? (
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="text-xs md:text-sm whitespace-nowrap">Business Intelligence</span>
              {!hasBusinessIntelligenceAccess && (
                <span className="text-xs bg-orange-500 text-white px-1 rounded ml-1">Pro</span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="performance-efficiency" 
              className={`flex items-center justify-center gap-1 md:gap-2 py-2 md:py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-blue-600 rounded-lg px-2 md:px-4 md:flex-1 ${
                !hasPerformanceAccess ? 'opacity-60' : ''
              }`}
            >
              {hasPerformanceAccess ? (
                <Activity className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="text-xs md:text-sm whitespace-nowrap">Performance</span>
              {!hasPerformanceAccess && (
                <span className="text-xs bg-orange-500 text-white px-1 rounded ml-1">Pro</span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="future-insights" 
              className={`flex items-center justify-center gap-1 md:gap-2 py-2 md:py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-purple-600 rounded-lg px-2 md:px-4 md:flex-1 ${
                !hasFutureInsightsAccess ? 'opacity-60' : ''
              }`}
            >
              {hasFutureInsightsAccess ? (
                <Brain className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="text-xs md:text-sm whitespace-nowrap">Future Insights</span>
              {!hasFutureInsightsAccess && (
                <span className="text-xs bg-orange-500 text-white px-1 rounded ml-1">Pro</span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="overview">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-2 md:p-6">
            <OverviewTab calendarIds={calendarIds} dateRange={dateRange} />
          </div>
        </TabsContent>

        <TabsContent value="business-intelligence">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-2 md:p-6">
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
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-2 md:p-6">
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
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-2 md:p-6">
            <LiveOperationsTab calendarIds={calendarIds} />
          </div>
        </TabsContent>

        <TabsContent value="future-insights">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-2 md:p-6">
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
