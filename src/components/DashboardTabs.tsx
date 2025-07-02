
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './dashboard-tabs/OverviewTab';
import { BusinessIntelligenceTab } from './dashboard-tabs/BusinessIntelligenceTab';
import { PerformanceEfficiencyTab } from './dashboard-tabs/PerformanceEfficiencyTab';
import { LiveOperationsTab } from './dashboard-tabs/LiveOperationsTab';
import { FutureInsightsTab } from './dashboard-tabs/FutureInsightsTab';
import { DateRange } from '@/utils/dateRangePresets';
import { 
  LayoutDashboard,
  TrendingUp, 
  Activity, 
  Radio, 
  Brain
} from 'lucide-react';

interface DashboardTabsProps {
  calendarId: string;
  dateRange: DateRange;
  onTabChange?: (tab: string) => void;
}

export function DashboardTabs({ calendarId, dateRange, onTabChange }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onTabChange?.(value);
  };

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
              value="business-intelligence" 
              className="flex items-center gap-1 md:gap-2 py-2 md:py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-orange-600 rounded-lg px-2 md:px-4"
            >
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline text-xs md:text-sm">Business Intelligence</span>
              <span className="sm:hidden text-xs">BI</span>
            </TabsTrigger>
            <TabsTrigger 
              value="performance-efficiency" 
              className="flex items-center gap-1 md:gap-2 py-2 md:py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-blue-600 rounded-lg px-2 md:px-4"
            >
              <Activity className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline text-xs md:text-sm">Performance</span>
              <span className="sm:hidden text-xs">Perf</span>
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
              value="future-insights" 
              className="flex items-center gap-1 md:gap-2 py-2 md:py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-purple-600 rounded-lg px-2 md:px-4"
            >
              <Brain className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline text-xs md:text-sm">Future Insights</span>
              <span className="sm:hidden text-xs">Future</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="overview">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-3 md:p-6">
            <OverviewTab calendarId={calendarId} />
          </div>
        </TabsContent>

        <TabsContent value="business-intelligence">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-3 md:p-6">
            <BusinessIntelligenceTab 
              calendarId={calendarId} 
              dateRange={dateRange}
            />
          </div>
        </TabsContent>

        <TabsContent value="performance-efficiency">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-3 md:p-6">
            <PerformanceEfficiencyTab 
              calendarId={calendarId}
              dateRange={dateRange}
            />
          </div>
        </TabsContent>

        <TabsContent value="live-operations">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-3 md:p-6">
            <LiveOperationsTab calendarId={calendarId} />
          </div>
        </TabsContent>

        <TabsContent value="future-insights">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-3 md:p-6">
            <FutureInsightsTab calendarId={calendarId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
