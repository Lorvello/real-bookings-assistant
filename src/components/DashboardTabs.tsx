
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BusinessIntelligenceTab } from './dashboard-tabs/BusinessIntelligenceTab';
import { PerformanceEfficiencyTab } from './dashboard-tabs/PerformanceEfficiencyTab';
import { LiveOperationsTab } from './dashboard-tabs/LiveOperationsTab';
import { FutureInsightsTab } from './dashboard-tabs/FutureInsightsTab';
import { 
  TrendingUp, 
  Activity, 
  Radio, 
  Brain, 
  BarChart3, 
  Zap 
} from 'lucide-react';

interface DashboardTabsProps {
  calendarId: string;
}

export function DashboardTabs({ calendarId }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState('business-intelligence');

  return (
    <div className="space-y-6">
      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-gray-800 h-auto p-2">
          <TabsTrigger 
            value="business-intelligence" 
            className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Business Intelligence</span>
            <span className="sm:hidden">BI</span>
          </TabsTrigger>
          <TabsTrigger 
            value="performance-efficiency" 
            className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg"
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
            className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg"
          >
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Future Insights</span>
            <span className="sm:hidden">Future</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="business-intelligence">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
            <BusinessIntelligenceTab calendarId={calendarId} />
          </div>
        </TabsContent>

        <TabsContent value="performance-efficiency">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
            <PerformanceEfficiencyTab calendarId={calendarId} />
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
