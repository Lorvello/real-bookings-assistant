
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Calendar, Settings, Zap } from 'lucide-react';

interface AvailabilityTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AvailabilityTabs: React.FC<AvailabilityTabsProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="bg-background/80 backdrop-blur-sm border border-border/60 rounded-3xl p-1">
            <TabsTrigger 
              value="schedule"
              className="flex items-center space-x-2 px-6 py-3 rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
            >
              <Clock className="h-4 w-4" />
              <span>Schedule</span>
            </TabsTrigger>
            <TabsTrigger 
              value="limits"
              className="flex items-center space-x-2 px-6 py-3 rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
              <span>Limits</span>
            </TabsTrigger>
            <TabsTrigger 
              value="advanced"
              className="flex items-center space-x-2 px-6 py-3 rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
            >
              <Zap className="h-4 w-4" />
              <span>Advanced</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};
