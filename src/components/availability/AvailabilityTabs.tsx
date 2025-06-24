
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Settings, Zap } from 'lucide-react';

interface AvailabilityTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AvailabilityTabs: React.FC<AvailabilityTabsProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <div className="mb-4">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-3 bg-gray-800 h-auto p-1">
          <TabsTrigger 
            value="schedule"
            className="flex items-center gap-2 py-2 px-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg"
          >
            <Clock className="h-4 w-4" />
            Schema
          </TabsTrigger>
          <TabsTrigger 
            value="limits"
            className="flex items-center gap-2 py-2 px-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg"
          >
            <Settings className="h-4 w-4" />
            Limieten
          </TabsTrigger>
          <TabsTrigger 
            value="advanced"
            className="flex items-center gap-2 py-2 px-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg"
          >
            <Zap className="h-4 w-4" />
            Geavanceerd
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
