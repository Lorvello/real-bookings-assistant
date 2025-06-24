
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
    <div className="p-8 pt-0">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-2 bg-gray-800 h-auto p-2">
          <TabsTrigger 
            value="schedule"
            className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg"
          >
            <Clock className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger 
            value="overrides"
            className="flex items-center gap-2 py-3 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-lg"
          >
            <Calendar className="h-4 w-4" />
            Date Overrides
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
