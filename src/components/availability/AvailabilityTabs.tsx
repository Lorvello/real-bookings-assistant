
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
        <TabsList className="grid w-full grid-cols-2 bg-gray-800 h-auto p-1.5">
          <TabsTrigger 
            value="schedule"
            className="flex items-center gap-2 py-2 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-md"
          >
            <Clock className="h-3.5 w-3.5" />
            Schedule
          </TabsTrigger>
          <TabsTrigger 
            value="overrides"
            className="flex items-center gap-2 py-2 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-md"
          >
            <Calendar className="h-3.5 w-3.5" />
            Date Overrides
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
