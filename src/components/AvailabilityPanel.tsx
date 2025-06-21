
import React, { useState } from 'react';
import { useAvailabilitySchedules } from '@/hooks/useAvailabilitySchedules';
import { useAvailabilityRules } from '@/hooks/useAvailabilityRules';
import { OverrideManager } from './availability/OverrideManager';
import { WeeklyScheduleTab } from './availability/WeeklyScheduleTab';
import { AvailabilityPanelHeader } from './availability/AvailabilityPanelHeader';
import { AvailabilityPanelTabs } from './availability/AvailabilityPanelTabs';
import { AvailabilityPanelToggle } from './availability/AvailabilityPanelToggle';

interface AvailabilityPanelProps {
  calendarId: string;
}

export function AvailabilityPanel({ calendarId }: AvailabilityPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'overrides'>('schedule');
  
  const { schedules, loading: schedulesLoading } = useAvailabilitySchedules(calendarId);
  const defaultSchedule = schedules.find(s => s.is_default);
  const { rules, loading: rulesLoading } = useAvailabilityRules(defaultSchedule?.id);

  return (
    <>
      {/* Collapse/Expand Button */}
      <AvailabilityPanelToggle 
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-in-out z-10 ${
          isExpanded ? 'transform translate-x-0' : 'transform translate-x-full'
        }`}
        style={{ width: '320px' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <AvailabilityPanelHeader />

          {/* Tabs */}
          <AvailabilityPanelTabs 
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'schedule' && (
              <WeeklyScheduleTab 
                calendarId={calendarId}
                scheduleId={defaultSchedule?.id}
                rules={rules}
                loading={rulesLoading}
              />
            )}
            
            {activeTab === 'overrides' && (
              <div className="h-full overflow-y-auto">
                <div className="p-4">
                  <OverrideManager calendarId={calendarId} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 z-0"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}
