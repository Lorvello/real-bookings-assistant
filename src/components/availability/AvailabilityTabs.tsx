
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Calendar } from 'lucide-react';

interface AvailabilityTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AvailabilityTabs: React.FC<AvailabilityTabsProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <div className="p-4 pt-0">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-2 bg-card/80 backdrop-blur-sm border border-border/60 h-auto p-1.5 rounded-2xl">
          <TabsTrigger 
            value="schedule"
            className="flex items-center gap-2 py-3 text-muted-foreground data-[state=active]:text-primary-foreground data-[state=active]:bg-primary rounded-xl transition-all duration-200 font-medium"
          >
            <Clock className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger 
            value="overrides"
            className="flex items-center gap-2 py-3 text-muted-foreground data-[state=active]:text-primary-foreground data-[state=active]:bg-primary rounded-xl transition-all duration-200 font-medium"
          >
            <Calendar className="h-4 w-4" />
            Date Overrides
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
