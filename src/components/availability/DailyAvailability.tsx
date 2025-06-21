
import React, { useState, useEffect, useMemo } from 'react';
import { DayRow } from './DayRow';
import { useAvailabilitySchedules } from '@/hooks/useAvailabilitySchedules';
import { useAvailabilityRules } from '@/hooks/useAvailabilityRules';
import { useCalendars } from '@/hooks/useCalendars';

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  enabled: boolean;
  timeBlocks: TimeBlock[];
}

interface DailyAvailabilityProps {
  onChange: () => void;
}

const DAYS = [
  { key: 'monday', label: 'Monday', isWeekend: false, dayOfWeek: 1 },
  { key: 'tuesday', label: 'Tuesday', isWeekend: false, dayOfWeek: 2 },
  { key: 'wednesday', label: 'Wednesday', isWeekend: false, dayOfWeek: 3 },
  { key: 'thursday', label: 'Thursday', isWeekend: false, dayOfWeek: 4 },
  { key: 'friday', label: 'Friday', isWeekend: false, dayOfWeek: 5 },
  { key: 'saturday', label: 'Saturday', isWeekend: true, dayOfWeek: 6 },
  { key: 'sunday', label: 'Sunday', isWeekend: true, dayOfWeek: 0 }
];

export const DailyAvailability: React.FC<DailyAvailabilityProps> = ({ onChange }) => {
  const { calendars } = useCalendars();
  const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
  
  const { schedules } = useAvailabilitySchedules(defaultCalendar?.id);
  const defaultSchedule = schedules.find(s => s.is_default) || schedules[0];
  
  const { rules, createRule, updateRule, deleteRule, syncingRules } = useAvailabilityRules(defaultSchedule?.id);

  const [availability, setAvailability] = useState<Record<string, DayAvailability>>(() => {
    const initial: Record<string, DayAvailability> = {};
    DAYS.forEach(day => {
      initial[day.key] = {
        enabled: !day.isWeekend,
        timeBlocks: [{
          id: `${day.key}-1`,
          startTime: '08:00',
          endTime: '19:00'
        }]
      };
    });
    return initial;
  });

  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());

  // Convert database rules to UI availability format
  const availabilityFromRules = useMemo(() => {
    const result: Record<string, DayAvailability> = {};
    
    DAYS.forEach(day => {
      const dayRules = rules.filter(rule => rule.day_of_week === day.dayOfWeek);
      
      if (dayRules.length > 0) {
        // Group rules by availability and merge consecutive time blocks if needed
        const availableRules = dayRules.filter(rule => rule.is_available);
        
        result[day.key] = {
          enabled: availableRules.length > 0,
          timeBlocks: availableRules.length > 0 
            ? availableRules.map((rule, index) => ({
                id: `${day.key}-${index + 1}`,
                startTime: rule.start_time,
                endTime: rule.end_time
              }))
            : [{
                id: `${day.key}-1`,
                startTime: '08:00',
                endTime: '19:00'
              }]
        };
      } else {
        // Use default values
        result[day.key] = {
          enabled: !day.isWeekend,
          timeBlocks: [{
            id: `${day.key}-1`,
            startTime: '08:00',
            endTime: '19:00'
          }]
        };
      }
    });
    
    return result;
  }, [rules]);

  // Update local state when rules change
  useEffect(() => {
    setAvailability(availabilityFromRules);
  }, [availabilityFromRules]);

  // Optimized sync function with debouncing
  const syncToDatabase = async (dayKey: string, dayData: DayAvailability) => {
    if (!defaultSchedule?.id) return;
    
    const day = DAYS.find(d => d.key === dayKey);
    if (!day) return;

    const updateId = `${dayKey}-${Date.now()}`;
    setPendingUpdates(prev => new Set(prev).add(updateId));

    try {
      // Delete existing rules for this day
      const existingRules = rules.filter(rule => rule.day_of_week === day.dayOfWeek);
      
      const deletePromises = existingRules.map(rule => deleteRule(rule.id));
      await Promise.all(deletePromises);

      // Create new rules based on current state
      if (dayData.enabled && dayData.timeBlocks.length > 0) {
        const createPromises = dayData.timeBlocks.map(timeBlock => 
          createRule({
            day_of_week: day.dayOfWeek,
            start_time: timeBlock.startTime,
            end_time: timeBlock.endTime,
            is_available: true
          })
        );
        await Promise.all(createPromises);
      } else {
        // Create a disabled rule to maintain the day in database
        await createRule({
          day_of_week: day.dayOfWeek,
          start_time: '09:00',
          end_time: '17:00',
          is_available: false
        });
      }
      
      onChange();
    } catch (error) {
      console.error('Error syncing to database:', error);
    } finally {
      setPendingUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(updateId);
        return newSet;
      });
    }
  };

  const updateDayEnabled = async (dayKey: string, enabled: boolean) => {
    const newAvailability = {
      ...availability,
      [dayKey]: { ...availability[dayKey], enabled }
    };
    
    setAvailability(newAvailability);
    await syncToDatabase(dayKey, newAvailability[dayKey]);
  };

  const updateTimeBlock = async (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => {
    const newAvailability = {
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        timeBlocks: availability[dayKey].timeBlocks.map(block =>
          block.id === blockId ? { ...block, [field]: value } : block
        )
      }
    };
    
    setAvailability(newAvailability);
    
    // Debounce the database sync
    const debounceKey = `${dayKey}-${blockId}-${field}`;
    setTimeout(() => {
      syncToDatabase(dayKey, newAvailability[dayKey]);
    }, 1000);
  };

  const addTimeBlock = async (dayKey: string) => {
    const currentBlocks = availability[dayKey].timeBlocks;
    const newBlockId = `${dayKey}-${currentBlocks.length + 1}`;
    const lastBlock = currentBlocks[currentBlocks.length - 1];
    
    const newAvailability = {
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        timeBlocks: [
          ...currentBlocks,
          {
            id: newBlockId,
            startTime: lastBlock?.endTime || '09:00',
            endTime: '17:00'
          }
        ]
      }
    };
    
    setAvailability(newAvailability);
    await syncToDatabase(dayKey, newAvailability[dayKey]);
  };

  const removeTimeBlock = async (dayKey: string, blockId: string) => {
    const newAvailability = {
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        timeBlocks: availability[dayKey].timeBlocks.filter(block => block.id !== blockId)
      }
    };
    
    setAvailability(newAvailability);
    await syncToDatabase(dayKey, newAvailability[dayKey]);
  };

  const toggleDropdown = (dropdownId: string) => {
    setOpenDropdowns(prev => {
      const newState: Record<string, boolean> = {};
      Object.keys(prev).forEach(key => {
        newState[key] = false;
      });
      newState[dropdownId] = !prev[dropdownId];
      return newState;
    });
  };

  const closeDropdown = (dropdownId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdownId]: false
    }));
  };

  // Show loading state if we don't have calendar data yet
  if (!defaultCalendar || !defaultSchedule) {
    return (
      <div className="space-y-6">
        <div className="text-center text-gray-400">Loading availability...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {DAYS.map((day) => {
        const dayAvailability = availability[day.key];
        const dayKey = day.key;
        const hasPendingUpdates = Array.from(pendingUpdates).some(id => id.startsWith(dayKey));
        const hasSyncingRules = Array.from(syncingRules).some(id => 
          rules.some(rule => rule.id === id && rule.day_of_week === day.dayOfWeek)
        );
        
        return (
          <div key={day.key} className="relative">
            {(hasPendingUpdates || hasSyncingRules) && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse z-10" />
            )}
            <DayRow
              day={day}
              dayAvailability={dayAvailability}
              openDropdowns={openDropdowns}
              onUpdateDayEnabled={updateDayEnabled}
              onUpdateTimeBlock={updateTimeBlock}
              onAddTimeBlock={addTimeBlock}
              onRemoveTimeBlock={removeTimeBlock}
              onToggleDropdown={toggleDropdown}
              onCloseDropdown={closeDropdown}
            />
          </div>
        );
      })}
    </div>
  );
};
