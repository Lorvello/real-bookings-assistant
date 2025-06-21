
import React, { useState } from 'react';
import { useDailyAvailabilityManager } from '@/hooks/useDailyAvailabilityManager';
import { ImprovedDayCard } from './ImprovedDayCard';

interface ImprovedDailyAvailabilityProps {
  onChange: () => void;
}

// Dutch days with proper order (Monday first)
const DUTCH_DAYS = [
  { key: 'monday', label: 'Maandag', dayOfWeek: 1, isWeekend: false },
  { key: 'tuesday', label: 'Dinsdag', dayOfWeek: 2, isWeekend: false },
  { key: 'wednesday', label: 'Woensdag', dayOfWeek: 3, isWeekend: false },
  { key: 'thursday', label: 'Donderdag', dayOfWeek: 4, isWeekend: false },
  { key: 'friday', label: 'Vrijdag', dayOfWeek: 5, isWeekend: false },
  { key: 'saturday', label: 'Zaterdag', dayOfWeek: 6, isWeekend: true },
  { key: 'sunday', label: 'Zondag', dayOfWeek: 0, isWeekend: true }
];

export const ImprovedDailyAvailability: React.FC<ImprovedDailyAvailabilityProps> = ({ onChange }) => {
  const {
    availability,
    setAvailability,
    pendingUpdates,
    defaultCalendar,
    defaultSchedule,
    syncToDatabase
  } = useDailyAvailabilityManager(onChange);

  const [debounceTimeouts, setDebounceTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());

  const updateDayEnabled = async (dayKey: string, enabled: boolean) => {
    const newAvailability = {
      ...availability,
      [dayKey]: { ...availability[dayKey], enabled }
    };
    
    setAvailability(newAvailability);
    
    // Clear any existing timeout for this day
    const existingTimeout = debounceTimeouts.get(dayKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      syncToDatabase(dayKey, newAvailability[dayKey]);
      setDebounceTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(dayKey);
        return newMap;
      });
    }, 800);
    
    setDebounceTimeouts(prev => new Map(prev).set(dayKey, timeout));
  };

  const updateTimeBlock = async (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => {
    const currentBlocks = availability[dayKey].timeBlocks;
    const updatedBlocks = currentBlocks.map(block =>
      block.id === blockId ? { ...block, [field]: value } : block
    );

    const newAvailability = {
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        timeBlocks: updatedBlocks
      }
    };
    
    setAvailability(newAvailability);
    
    // Clear any existing timeout for this specific update
    const timeoutKey = `${dayKey}-${blockId}-${field}`;
    const existingTimeout = debounceTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout with longer delay for time changes
    const timeout = setTimeout(() => {
      syncToDatabase(dayKey, newAvailability[dayKey]);
      setDebounceTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(timeoutKey);
        return newMap;
      });
    }, 1500);
    
    setDebounceTimeouts(prev => new Map(prev).set(timeoutKey, timeout));
  };

  const addTimeBlock = async (dayKey: string) => {
    const currentBlocks = availability[dayKey].timeBlocks;
    const newBlockId = `${dayKey}-${Date.now()}`; 
    const lastBlock = currentBlocks[currentBlocks.length - 1];
    
    // Calculate next available start time
    let newStartTime = lastBlock?.endTime || '09:00';
    let newEndTime = '17:00';
    
    // If the last block ends at or after 17:00, start the new block at a reasonable time
    if (newStartTime >= '17:00') {
      newStartTime = '08:00';
      newEndTime = '12:00';
    }

    const newTimeBlock = {
      id: newBlockId,
      startTime: newStartTime,
      endTime: newEndTime
    };
    
    const newAvailability = {
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        timeBlocks: [...currentBlocks, newTimeBlock]
      }
    };
    
    setAvailability(newAvailability);
    
    // Immediate sync for adding blocks
    await syncToDatabase(dayKey, newAvailability[dayKey]);
  };

  const removeTimeBlock = async (dayKey: string, blockId: string) => {
    // Don't allow removing the last time block
    if (availability[dayKey].timeBlocks.length <= 1) {
      return;
    }
    
    const newAvailability = {
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        timeBlocks: availability[dayKey].timeBlocks.filter(block => block.id !== blockId)
      }
    };
    
    setAvailability(newAvailability);
    
    // Immediate sync for removing blocks
    await syncToDatabase(dayKey, newAvailability[dayKey]);
  };

  // Show loading state if we don't have calendar data yet
  if (!defaultCalendar || !defaultSchedule) {
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-400 py-8">Beschikbaarheid laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {DUTCH_DAYS.map((day) => {
        const dayAvailability = availability[day.key];
        const hasPendingUpdates = Array.from(pendingUpdates).some(id => id.startsWith(day.key));
        
        return (
          <ImprovedDayCard
            key={day.key}
            day={day}
            dayAvailability={dayAvailability}
            hasPendingUpdates={hasPendingUpdates}
            onUpdateDayEnabled={updateDayEnabled}
            onUpdateTimeBlock={updateTimeBlock}
            onAddTimeBlock={addTimeBlock}
            onRemoveTimeBlock={removeTimeBlock}
          />
        );
      })}
    </div>
  );
};
