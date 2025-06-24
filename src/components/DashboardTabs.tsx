
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './dashboard-tabs/OverviewTab';
import { BusinessIntelligenceTab } from './dashboard-tabs/BusinessIntelligenceTab';
import { PerformanceEfficiencyTab } from './dashboard-tabs/PerformanceEfficiencyTab';
import { LiveOperationsTab } from './dashboard-tabs/LiveOperationsTab';
import { FutureInsightsTab } from './dashboard-tabs/FutureInsightsTab';
import { DateRangeFilter } from './dashboard/DateRangeFilter';
import { DateRange, getPresetRange } from '@/utils/dateRangePresets';
import { 
  LayoutDashboard,
  TrendingUp, 
  Activity, 
  Radio, 
  Brain
} from 'lucide-react';

interface DashboardTabsProps {
  calendarId: string;
}

// Create a default date range as fallback
const getDefaultDateRange = (): DateRange => {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return {
    startDate,
    endDate,
    preset: 'last30days',
    label: 'Last 30 days'
  };
};

export function DashboardTabs({ calendarId }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>(() => {
    try {
      return getPresetRange('last30days');
    } catch (error) {
      console.error('Error getting preset range, using default:', error);
      return getDefaultDateRange();
    }
  });

  // Check if current tab needs date filtering
  const tabsWithDateFilter = ['business-intelligence', 'performance-efficiency'];
  const showDateFilter = tabsWithDateFilter.includes(activeTab);

  return (
    <div className="space-y-6">
      {/* Date Filter - Only show for specific tabs */}
      {showDateFilter && (
        <div className="flex justify-end">
          <DateRangeFilter 
            selectedRange={selectedDateRange}
            onRangeChange={setSelectedDateRange}
          />
        </div>
      )}

      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-gray-800 h-auto p-2">
          <TabsTrigger 
            value="overview" 
            className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-cyan-600 rounded-lg"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Home</span>
          </TabsTrigger>
          <TabsTrigger 
            value="business-intelligence" 
            className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-orange-600 rounded-lg"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Business Intelligence</span>
            <span className="sm:hidden">BI</span>
          </TabsTrigger>
          <TabsTrigger 
            value="performance-efficiency" 
            className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-blue-600 rounded-lg"
          >
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Performance</span>
            <span className="sm:hidden">Perf</span>
          </TabsTrigger>
          <TabsTrigger 
            value="live-operations" 
            className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg"
          >
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Live Operations</span>
            <span className="sm:hidden">Live</span>
          </TabsTrigger>
          <TabsTrigger 
            value="future-insights" 
            className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-purple-600 rounded-lg"
          >
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Future Insights</span>
            <span className="sm:hidden">Future</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="overview">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
            <OverviewTab calendarId={calendarId} />
          </div>
        </TabsContent>

        <TabsContent value="business-intelligence">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
            <BusinessIntelligenceTab 
              calendarId={calendarId} 
              dateRange={selectedDateRange}
            />
          </div>
        </TabsContent>

        <TabsContent value="performance-efficiency">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
            <PerformanceEfficiencyTab 
              calendarId={calendarId}
              dateRange={selectedDateRange}
            />
          </div>
        </TabsContent>

        <TabsContent value="live-operations">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
            <LiveOperationsTab calendarId={calendarId} />
          </div>
        </TabsContent>

        <TabsContent value="future-insights">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
            <FutureInsightsTab calendarId={calendarId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
