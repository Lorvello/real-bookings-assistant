
import React from 'react';

interface AvailabilityPanelTabsProps {
  activeTab: 'schedule' | 'overrides';
  onTabChange: (tab: 'schedule' | 'overrides') => void;
}

export function AvailabilityPanelTabs({ activeTab, onTabChange }: AvailabilityPanelTabsProps) {
  return (
    <div className="flex-shrink-0 p-4">
      <div className="flex space-x-1 bg-muted rounded-lg p-1">
        <button
          onClick={() => onTabChange('schedule')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'schedule' 
              ? 'bg-primary text-primary-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Schedule
        </button>
        <button
          onClick={() => onTabChange('overrides')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'overrides' 
              ? 'bg-primary text-primary-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Exceptions
        </button>
      </div>
    </div>
  );
}
