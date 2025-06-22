
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
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Organic Tab Navigation */}
        <div className="relative mb-8">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-purple-500/15 to-primary/20 blur-xl rounded-3xl"></div>
          
          <TabsList className="relative grid w-full grid-cols-4 bg-gradient-to-br from-card/95 via-card/80 to-card/70 backdrop-blur-2xl border border-primary/30 shadow-2xl p-2 h-auto rounded-3xl">
            <TabsTrigger value="live-ops" 
                        className="flex items-center gap-3 py-4 px-6 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:via-primary/15 data-[state=active]:to-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-primary/30">
              <Activity className="h-5 w-5" />
              <span className="font-semibold">Live Ops</span>
            </TabsTrigger>
            
            <TabsTrigger value="business-intel"
                        className="flex items-center gap-3 py-4 px-6 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:via-blue-500/15 data-[state=active]:to-blue-500/10 data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-blue-500/30">
              <BarChart3 className="h-5 w-5" />
              <span className="font-semibold">Analytics</span>
            </TabsTrigger>
            
            <TabsTrigger value="performance"
                        className="flex items-center gap-3 py-4 px-6 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/20 data-[state=active]:via-yellow-500/15 data-[state=active]:to-yellow-500/10 data-[state=active]:text-yellow-400 data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-yellow-500/30">
              <Zap className="h-5 w-5" />
              <span className="font-semibold">Performance</span>
            </TabsTrigger>
            
            <TabsTrigger value="insights"
                        className="flex items-center gap-3 py-4 px-6 rounded-2xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:via-purple-500/15 data-[state=active]:to-purple-500/10 data-[state=active]:text-purple-400 data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-purple-500/30">
              <TrendingUp className="h-5 w-5" />
              <span className="font-semibold">Predictions</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Organic Tab Content */}
        <TabsContent value="live-ops" className="space-y-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-2xl rounded-3xl"></div>
            <div className="relative bg-gradient-to-br from-card/95 via-card/80 to-card/60 backdrop-blur-2xl border border-primary/20 shadow-2xl p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-green-400 rounded-full flex items-center justify-center shadow-lg">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  Live Operations Center
                </h2>
                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-primary rounded-full animate-pulse shadow-lg"></div>
              </div>
              <LiveOperationsTab calendarId={calendarId} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="business-intel" className="space-y-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent blur-2xl rounded-3xl"></div>
            <div className="relative bg-gradient-to-br from-card/95 via-card/80 to-card/60 backdrop-blur-2xl border border-blue-500/20 shadow-2xl p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-blue-400 bg-clip-text text-transparent">
                  Business Intelligence
                </h2>
              </div>
              <BusinessIntelligenceTab calendarId={calendarId} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-yellow-500/20 via-yellow-500/10 to-transparent blur-2xl rounded-3xl"></div>
            <div className="relative bg-gradient-to-br from-card/95 via-card/80 to-card/60 backdrop-blur-2xl border border-yellow-500/20 shadow-2xl p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-yellow-400 bg-clip-text text-transparent">
                  Performance & Efficiency
                </h2>
              </div>
              <PerformanceEfficiencyTab calendarId={calendarId} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-transparent blur-2xl rounded-3xl"></div>
            <div className="relative bg-gradient-to-br from-card/95 via-card/80 to-card/60 backdrop-blur-2xl border border-purple-500/20 shadow-2xl p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-purple-400 bg-clip-text text-transparent">
                  Future Insights & Predictions
                </h2>
              </div>
              <FutureInsightsTab calendarId={calendarId} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
