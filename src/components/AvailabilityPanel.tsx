import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAvailabilitySchedules } from '@/hooks/useAvailabilitySchedules';
import { useAvailabilityRules } from '@/hooks/useAvailabilityRules';
import { useAvailabilityOverrides } from '@/hooks/useAvailabilityOverrides';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Plus, Settings } from 'lucide-react';

interface AvailabilityPanelProps {
  calendarId: string;
}

export function AvailabilityPanel({ calendarId }: AvailabilityPanelProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'overrides'>('schedule');
  const { toast } = useToast();
  
  const { schedules, loading: schedulesLoading } = useAvailabilitySchedules(calendarId);
  const defaultSchedule = schedules.find(s => s.is_default);
  const { rules, loading: rulesLoading } = useAvailabilityRules(defaultSchedule?.id);
  const { overrides } = useAvailabilityOverrides(calendarId);

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 h-full overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-5 w-5 text-green-600" />
        <h2 className="text-xl font-semibold text-white">Beschikbaarheid</h2>
      </div>
      
      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-900 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'schedule' 
              ? 'bg-green-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Standaard Schema
        </button>
        <button
          onClick={() => setActiveTab('overrides')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'overrides' 
              ? 'bg-green-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Uitzonderingen
        </button>
      </div>

      {/* Content */}
      {activeTab === 'schedule' && (
        <WeeklyScheduleTab 
          calendarId={calendarId}
          scheduleId={defaultSchedule?.id}
          rules={rules}
          loading={rulesLoading}
        />
      )}
      
      {activeTab === 'overrides' && (
        <OverridesTab 
          calendarId={calendarId}
          overrides={overrides}
        />
      )}
    </div>
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
      <div className="space-y-4">
        {dayNames.map((day, index) => (
          <div key={day} className="flex items-center space-x-3">
            <div className="w-28 h-4 bg-gray-700 rounded animate-pulse"></div>
            <div className="w-11 h-6 bg-gray-700 rounded-full animate-pulse"></div>
            <div className="w-20 h-8 bg-gray-700 rounded animate-pulse"></div>
            <div className="w-20 h-8 bg-gray-700 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Werkschema per week</h3>
        <button className="text-xs text-green-600 hover:text-green-500 flex items-center gap-1">
          <Settings className="h-3 w-3" />
          Template
        </button>
      </div>
      
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
  );
}

// Overrides Tab Component
function OverridesTab({ 
  calendarId, 
  overrides 
}: { 
  calendarId: string;
  overrides: any[];
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { createOverride } = useAvailabilityOverrides(calendarId);

  const addVacation = async () => {
    if (!selectedDate) return;
    
    await createOverride({
      date: selectedDate.toISOString().split('T')[0],
      is_available: false,
      reason: 'Vakantie'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Uitzonderingen & Speciale dagen</h3>
        <button className="text-xs text-green-600 hover:text-green-500 flex items-center gap-1">
          <Plus className="h-3 w-3" />
          Toevoegen
        </button>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <button className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-sm text-left transition-colors group">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              🏖️ Vakantie toevoegen
            </span>
            <Plus className="h-4 w-4 text-gray-400 group-hover:text-white" />
          </div>
        </button>
        
        <button className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-sm text-left transition-colors group">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              📅 Speciale openingstijden
            </span>
            <Plus className="h-4 w-4 text-gray-400 group-hover:text-white" />
          </div>
        </button>
        
        <button className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-sm text-left transition-colors group">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              🚫 Dag blokkeren
            </span>
            <Plus className="h-4 w-4 text-gray-400 group-hover:text-white" />
          </div>
        </button>
      </div>

      {/* Existing Overrides */}
      {overrides.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Geplande uitzonderingen</h4>
          <div className="space-y-2">
            {overrides.map((override) => (
              <div key={override.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <div>
                  <div className="text-sm text-white">{override.date}</div>
                  <div className="text-xs text-gray-400">
                    {override.is_available ? 'Aangepaste tijden' : override.reason || 'Niet beschikbaar'}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {override.is_available ? '🕐' : '🚫'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
    <div className="flex items-center space-x-3 group">
      <div className="w-28">
        <span className={`text-sm transition-colors ${
          isAvailable ? 'text-white' : 'text-gray-500'
        }`}>
          {day}
        </span>
      </div>
      
      <button
        onClick={() => setIsAvailable(!isAvailable)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isAvailable ? 'bg-green-600' : 'bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isAvailable ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      
      {isAvailable && (
        <>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="px-3 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-green-600 focus:outline-none transition-colors"
          />
          <span className="text-gray-400">-</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="px-3 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-green-600 focus:outline-none transition-colors"
          />
        </>
      )}
      
      {hasChanges && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-yellow-500">Wordt opgeslagen...</span>
        </div>
      )}
    </div>
  );
}
