import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAvailabilitySchedules } from '@/hooks/useAvailabilitySchedules';
import { useAvailabilityRules } from '@/hooks/useAvailabilityRules';
import { useAvailabilityOverrides } from '@/hooks/useAvailabilityOverrides';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Plus, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { OverrideManager } from './availability/OverrideManager';

interface AvailabilityPanelProps {
  calendarId: string;
}

export function AvailabilityPanel({ calendarId }: AvailabilityPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'overrides'>('schedule');
  const { toast } = useToast();
  
  const { schedules, loading: schedulesLoading } = useAvailabilitySchedules(calendarId);
  const defaultSchedule = schedules.find(s => s.is_default);
  const { rules, loading: rulesLoading } = useAvailabilityRules(defaultSchedule?.id);

  return (
    <>
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`fixed top-1/2 -translate-y-1/2 z-20 bg-primary hover:bg-primary/90 text-white p-2 rounded-l-lg shadow-lg transition-all duration-300 ${
          isExpanded ? 'right-80' : 'right-0'
        }`}
        title={isExpanded ? 'Beschikbaarheid inklappen' : 'Beschikbaarheid uitklappen'}
      >
        {isExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-in-out z-10 ${
          isExpanded ? 'transform translate-x-0' : 'transform translate-x-full'
        }`}
        style={{ width: '320px' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Beschikbaarheid</h2>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-shrink-0 p-4">
            <div className="flex space-x-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  activeTab === 'schedule' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Schema
              </button>
              <button
                onClick={() => setActiveTab('overrides')}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  activeTab === 'overrides' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Uitzonderingen
              </button>
            </div>
          </div>

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

// Weekly Schedule Tab Component
function WeeklyScheduleTab({ 
  calendarId, 
  scheduleId, 
  rules, 
  loading 
}: { 
  calendarId: string;
  scheduleId?: string;
  rules: any[];
  loading: boolean;
}) {
  const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {dayNames.map((day, index) => (
          <div key={day} className="flex items-center space-x-3">
            <div className="w-20 h-4 bg-muted rounded animate-pulse"></div>
            <div className="w-8 h-5 bg-muted rounded-full animate-pulse"></div>
            <div className="w-16 h-6 bg-muted rounded animate-pulse"></div>
            <div className="w-16 h-6 bg-muted rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground">Werkschema</h3>
          <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            <Settings className="h-3 w-3" />
            Template
          </button>
        </div>
        
        <div className="space-y-3">
          {dayNames.map((day, index) => {
            const dayRule = rules.find(rule => rule.day_of_week === index);
            return (
              <DayAvailability
                key={day}
                day={day}
                dayIndex={index}
                scheduleId={scheduleId}
                initialRule={dayRule}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Day Availability Component
function DayAvailability({ 
  day, 
  dayIndex, 
  scheduleId, 
  initialRule 
}: { 
  day: string;
  dayIndex: number;
  scheduleId?: string;
  initialRule?: any;
}) {
  const [isAvailable, setIsAvailable] = useState(initialRule?.is_available ?? true);
  const [startTime, setStartTime] = useState(initialRule?.start_time || '09:00');
  const [endTime, setEndTime] = useState(initialRule?.end_time || '17:00');
  const [hasChanges, setHasChanges] = useState(false);
  
  const { updateRule, createRule } = useAvailabilityRules(scheduleId);
  const { toast } = useToast();

  // Track changes
  useEffect(() => {
    const changed = 
      isAvailable !== (initialRule?.is_available ?? true) ||
      startTime !== (initialRule?.start_time || '09:00') ||
      endTime !== (initialRule?.end_time || '17:00');
    setHasChanges(changed);
  }, [isAvailable, startTime, endTime, initialRule]);

  const saveChanges = async () => {
    if (!scheduleId) return;

    try {
      if (initialRule) {
        await updateRule(initialRule.id, {
          is_available: isAvailable,
          start_time: startTime,
          end_time: endTime
        });
      } else {
        await createRule({
          day_of_week: dayIndex,
          start_time: startTime,
          end_time: endTime,
          is_available: isAvailable
        });
      }
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving availability:', error);
    }
  };

  // Auto-save after 1 second of no changes
  useEffect(() => {
    if (hasChanges) {
      const timeout = setTimeout(saveChanges, 1000);
      return () => clearTimeout(timeout);
    }
  }, [hasChanges, isAvailable, startTime, endTime]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${
          isAvailable ? 'text-foreground' : 'text-muted-foreground'
        }`}>
          {day}
        </span>
        
        <button
          onClick={() => setIsAvailable(!isAvailable)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            isAvailable ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              isAvailable ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      
      {isAvailable && (
        <div className="flex items-center space-x-2 text-xs">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="flex-1 px-2 py-1 bg-background border border-border rounded text-foreground focus:border-primary focus:outline-none"
          />
          <span className="text-muted-foreground">-</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="flex-1 px-2 py-1 bg-background border border-border rounded text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      )}
      
      {hasChanges && (
        <div className="flex items-center gap-1 text-xs text-yellow-600">
          <div className="w-1 h-1 bg-yellow-600 rounded-full animate-pulse"></div>
          <span>Opslaan...</span>
        </div>
      )}
    </div>
  );
}
