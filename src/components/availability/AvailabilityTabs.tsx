
import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('appPages');
  return (
    <div className="p-4 pt-0">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-2 surface-raised h-auto p-1.5 rounded-2xl">
          <TabsTrigger 
            value="schedule"
            className="flex items-center gap-2 py-3 text-muted-foreground data-[state=active]:text-primary-foreground data-[state=active]:bg-primary rounded-xl transition-all duration-200 font-medium"
          >
            <Clock className="h-4 w-4" />
            {t('availPage.tab.schedule', 'Schedule')}
          </TabsTrigger>
          <TabsTrigger 
            value="overrides"
            className="flex items-center gap-2 py-3 text-muted-foreground data-[state=active]:text-primary-foreground data-[state=active]:bg-primary rounded-xl transition-all duration-200 font-medium"
          >
            <Calendar className="h-4 w-4" />
            {t('availPage.tab.overrides', 'Date Overrides')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
