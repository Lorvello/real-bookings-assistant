
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './dashboard-tabs/OverviewTab';
import { BusinessIntelligenceTab } from './dashboard-tabs/BusinessIntelligenceTab';
import { PerformanceEfficiencyTab } from './dashboard-tabs/PerformanceEfficiencyTab';
import { LiveOperationsTab } from './dashboard-tabs/LiveOperationsTab';
import { FutureInsightsTab } from './dashboard-tabs/FutureInsightsTab';
import { AccessBlockedOverlay } from './user-status/AccessBlockedOverlay';
import { DateRange } from '@/utils/dateRangePresets';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  TrendingUp, 
  Activity, 
  Radio, 
  Brain,
  Lock
} from 'lucide-react';

interface DashboardTabsProps {
  calendarId: string;
  calendarIds?: string[]; // Optional array for multi-calendar support
  dateRange: DateRange;
  onTabChange?: (tab: string) => void;
}

export function DashboardTabs({ calendarId, calendarIds, dateRange, onTabChange }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { checkAccess, requireAccess } = useAccessControl();
  const navigate = useNavigate();

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
    navigate('/pricing');
  };

  const hasBusinessIntelligenceAccess = checkAccess('canAccessBusinessIntelligence');
  const hasPerformanceAccess = checkAccess('canAccessPerformance');
  const hasFutureInsightsAccess = checkAccess('canAccessFutureInsights');

  return (
    <div className="space-y-6">
      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto">
          <TabsList className="grid grid-cols-5 bg-gray-800 h-auto p-1 md:p-2 flex-shrink-0 min-w-max">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-1 md:gap-2 py-2 md:py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-cyan-600 rounded-lg px-2 md:px-4"
            >
              <LayoutDashboard className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline text-xs md:text-sm">Overview</span>
              <span className="sm:hidden text-xs">Home</span>
            </TabsTrigger>
            <TabsTrigger 
              value="live-operations" 
              className="flex items-center gap-1 md:gap-2 py-2 md:py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg px-2 md:px-4"
            >
              <Radio className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline text-xs md:text-sm">Live Operations</span>
              <span className="sm:hidden text-xs">Live</span>
            </TabsTrigger>
            <TabsTrigger 
              value="business-intelligence" 
              className={`flex items-center gap-1 md:gap-2 py-2 md:py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-orange-600 rounded-lg px-2 md:px-4 ${
                !hasBusinessIntelligenceAccess ? 'opacity-60' : ''
              }`}
            >
              {hasBusinessIntelligenceAccess ? (
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="hidden sm:inline text-xs md:text-sm">Business Intelligence</span>
              <span className="sm:hidden text-xs">BI</span>
              {!hasBusinessIntelligenceAccess && (
                <span className="text-xs bg-orange-500 text-white px-1 rounded ml-1">Pro</span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="performance-efficiency" 
              className={`flex items-center gap-1 md:gap-2 py-2 md:py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-blue-600 rounded-lg px-2 md:px-4 ${
                !hasPerformanceAccess ? 'opacity-60' : ''
              }`}
            >
              {hasPerformanceAccess ? (
                <Activity className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="hidden sm:inline text-xs md:text-sm">Performance</span>
              <span className="sm:hidden text-xs">Perf</span>
              {!hasPerformanceAccess && (
                <span className="text-xs bg-orange-500 text-white px-1 rounded ml-1">Pro</span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="future-insights" 
              className={`flex items-center gap-1 md:gap-2 py-2 md:py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-purple-600 rounded-lg px-2 md:px-4 ${
                !hasFutureInsightsAccess ? 'opacity-60' : ''
              }`}
            >
              {hasFutureInsightsAccess ? (
                <Brain className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="hidden sm:inline text-xs md:text-sm">Future Insights</span>
              <span className="sm:hidden text-xs">Future</span>
              {!hasFutureInsightsAccess && (
                <span className="text-xs bg-orange-500 text-white px-1 rounded ml-1">Pro</span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="overview">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-3 md:p-6">
            <OverviewTab calendarId={calendarId} calendarIds={calendarIds} />
          </div>
        </TabsContent>

        <TabsContent value="business-intelligence">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-3 md:p-6">
            {hasBusinessIntelligenceAccess ? (
              <BusinessIntelligenceTab 
                calendarId={calendarId} 
                calendarIds={calendarIds}
                dateRange={dateRange}
              />
            ) : (
              <AccessBlockedOverlay
                userStatus={{ 
                  userType: 'trial',
                  statusMessage: 'Business Intelligence is alleen beschikbaar voor Professional en Enterprise abonnementen'
                } as any}
                feature="Business Intelligence"
                description="Krijg toegang tot geavanceerde business metrics, revenue analytics en service performance om je bedrijf te laten groeien."
                onUpgrade={handleUpgrade}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance-efficiency">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-3 md:p-6">
            {hasPerformanceAccess ? (
              <PerformanceEfficiencyTab 
                calendarId={calendarId}
                calendarIds={calendarIds}
                dateRange={dateRange}
              />
            ) : (
              <AccessBlockedOverlay
                userStatus={{ 
                  userType: 'trial',
                  statusMessage: 'Performance & Efficiency is alleen beschikbaar voor Professional en Enterprise abonnementen'
                } as any}
                feature="Performance & Efficiency"
                description="Krijg toegang tot performance metrics, no-show rates, customer satisfaction scores en efficiency analytics."
                onUpgrade={handleUpgrade}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="live-operations">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-3 md:p-6">
            <LiveOperationsTab calendarId={calendarId} calendarIds={calendarIds} />
          </div>
        </TabsContent>

        <TabsContent value="future-insights">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-3 md:p-6">
            {hasFutureInsightsAccess ? (
              <FutureInsightsTab calendarId={calendarId} calendarIds={calendarIds} />
            ) : (
              <AccessBlockedOverlay
                userStatus={{ 
                  userType: 'trial',
                  statusMessage: 'Future Insights is alleen beschikbaar voor Professional en Enterprise abonnementen'
                } as any}
                feature="Future Insights"
                description="Krijg toegang tot geavanceerde voorspellingen, seizoenspatronen en AI-aanbevelingen om je bedrijf te laten groeien."
                onUpgrade={handleUpgrade}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
