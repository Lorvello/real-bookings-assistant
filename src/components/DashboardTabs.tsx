
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RealtimeDashboard } from '@/components/RealtimeDashboard';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { OptimizedAnalyticsDashboard } from '@/components/OptimizedAnalyticsDashboard';
import { BarChart3, TrendingUp, Zap, Activity } from 'lucide-react';

interface DashboardTabsProps {
  calendarId: string;
}

export function DashboardTabs({ calendarId }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur-sm border border-border/60">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overzicht
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="bg-gradient-to-br from-background via-card/50 to-background rounded-xl p-6 border border-border/40">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Real-time Dashboard</h2>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2"></div>
            </div>
            <RealtimeDashboard calendarId={calendarId} />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="bg-gradient-to-br from-background via-card/50 to-background rounded-xl p-6 border border-border/40">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Uitgebreide Analytics</h2>
            </div>
            <AnalyticsDashboard calendarId={calendarId} />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="bg-gradient-to-br from-background via-card/50 to-background rounded-xl p-6 border border-border/40">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-yellow-600" />
              <h2 className="text-xl font-semibold">Performance Dashboard</h2>
            </div>
            <OptimizedAnalyticsDashboard calendarId={calendarId} />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="bg-gradient-to-br from-background via-card/50 to-background rounded-xl p-6 border border-border/40">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold">Booking Trends</h2>
            </div>
            <AnalyticsDashboard calendarId={calendarId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
