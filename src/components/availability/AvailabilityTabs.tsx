
import React from 'react';

interface AvailabilityTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AvailabilityTabs: React.FC<AvailabilityTabsProps> = ({
  activeTab,
  onTabChange
}) => {
  const tabs = [
    { id: 'schedule', label: 'Schema' },
    { id: 'limits', label: 'Limieten' },
    { id: 'advanced', label: 'Geavanceerd' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-4">
      <div className="flex space-x-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};
