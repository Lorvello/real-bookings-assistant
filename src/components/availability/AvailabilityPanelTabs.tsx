
import React from 'react';

interface AvailabilityPanelTabsProps {
  activeTab: 'schedule' | 'overrides';
  onTabChange: (tab: 'schedule' | 'overrides') => void;
}

export function AvailabilityPanelTabs({ activeTab, onTabChange }: AvailabilityPanelTabsProps) {
  return (
    <div className="p-4 bg-background/30 border-b border-border/40">
      <div className="flex space-x-1 bg-muted/50 rounded-2xl p-1 border border-border/40">
        <button
          onClick={() => onTabChange('schedule')}
          className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === 'schedule' 
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          Schema
        </button>
        <button
          onClick={() => onTabChange('overrides')}
          className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === 'overrides' 
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          Uitzonderingen
        </button>
      </div>
    </div>
  );
}
