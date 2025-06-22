
import React, { useState } from 'react';
import { AvailabilityPanelHeader } from './availability/AvailabilityPanelHeader';
import { AvailabilityPanelToggle } from './availability/AvailabilityPanelToggle';
import { AvailabilityPanelTabs } from './availability/AvailabilityPanelTabs';
import { WeeklyScheduleTab } from './availability/WeeklyScheduleTab';
import { DateOverrides } from './availability/DateOverrides';

interface AvailabilityPanelProps {
  calendarId: string;
}

export function AvailabilityPanel({ calendarId }: AvailabilityPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'overrides'>('schedule');

  return (
    <>
      {/* Toggle Button */}
      <AvailabilityPanelToggle 
        isExpanded={isExpanded} 
        onToggle={() => setIsExpanded(!isExpanded)} 
      />
      
      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-card/95 backdrop-blur-sm border-l border-border/60 shadow-2xl transform transition-transform duration-300 ease-in-out z-10 ${
        isExpanded ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col overflow-hidden rounded-l-3xl">
          {/* Header */}
          <AvailabilityPanelHeader />
          
          {/* Tabs */}
          <AvailabilityPanelTabs 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background/20 to-card/40">
            {activeTab === 'schedule' && (
              <WeeklyScheduleTab calendarId={calendarId} />
            )}
            
            {activeTab === 'overrides' && (
              <DateOverrides calendarId={calendarId} />
            )}
          </div>
        </div>
      </div>
      
      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-5 transition-opacity duration-300"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}
