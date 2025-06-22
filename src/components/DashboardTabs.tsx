
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiveOperationsTab } from '@/components/dashboard-tabs/LiveOperationsTab';
import { BusinessIntelligenceTab } from '@/components/dashboard-tabs/BusinessIntelligenceTab';
import { PerformanceEfficiencyTab } from '@/components/dashboard-tabs/PerformanceEfficiencyTab';
import { FutureInsightsTab } from '@/components/dashboard-tabs/FutureInsightsTab';
import { Activity, BarChart3, Zap, TrendingUp } from 'lucide-react';

interface DashboardTabsProps {
  calendarId: string;
}

export function DashboardTabs({ calendarId }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState('live-ops');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur-sm border border-border/60">
          <TabsTrigger value="live-ops" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Ops
          </TabsTrigger>
          <TabsTrigger value="business-intel" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Predictions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live-ops" className="space-y-6">
          <div className="bg-gradient-to-br from-background via-card/50 to-background rounded-xl p-6 border border-border/40">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold">Live Operations Center</h2>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2"></div>
            </div>
            <LiveOperationsTab calendarId={calendarId} />
          </div>
        </TabsContent>

        <TabsContent value="business-intel" className="space-y-6">
          <div className="bg-gradient-to-br from-background via-card/50 to-background rounded-xl p-6 border border-border/40">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Business Intelligence</h2>
            </div>
            <BusinessIntelligenceTab calendarId={calendarId} />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="bg-gradient-to-br from-background via-card/50 to-background rounded-xl p-6 border border-border/40">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-yellow-600" />
              <h2 className="text-xl font-semibold">Performance & Efficiency</h2>
            </div>
            <PerformanceEfficiencyTab calendarId={calendarId} />
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="bg-gradient-to-br from-background via-card/50 to-background rounded-xl p-6 border border-border/40">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-semibold">Future Insights & Predictions</h2>
            </div>
            <FutureInsightsTab calendarId={calendarId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
