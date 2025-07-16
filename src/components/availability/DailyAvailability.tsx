
import React, { useState } from 'react';
import { AvailabilityDayRow } from './AvailabilityDayRow';
import { useDailyAvailabilityManager } from '@/hooks/useDailyAvailabilityManager';

interface DailyAvailabilityProps {
  onChange: () => void;
}

export const DailyAvailability: React.FC<DailyAvailabilityProps> = ({ onChange }) => {
  const {
    DAYS,
    availability,
    setAvailability,
    pendingUpdates,
    syncingRules,
    defaultCalendar,
    defaultSchedule,
    syncToDatabase,
    createDefaultSchedule
  } = useDailyAvailabilityManager(onChange);

  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
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

    // Validate for duplicate times before updating
    const hasDuplicates = updatedBlocks.some((block, index) => 
      updatedBlocks.findIndex(b => b.startTime === block.startTime && b.endTime === block.endTime) !== index
    );

    if (hasDuplicates) {
      console.warn(`Duplicate time block detected for ${dayKey}, not updating`);
      return;
    }

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
    console.log(`Adding time block for ${dayKey}`);
    
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

    // Check for duplicates before adding
    const wouldCreateDuplicate = currentBlocks.some(block => 
      block.startTime === newTimeBlock.startTime && block.endTime === newTimeBlock.endTime
    );

    if (wouldCreateDuplicate) {
      console.warn(`Would create duplicate time block for ${dayKey}, not adding`);
      return;
    }
    
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
      console.log('Cannot remove the last time block');
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
  if (!defaultCalendar) {
    return (
      <div className="space-y-3">
        <div className="text-center text-gray-400">Loading availability...</div>
      </div>
    );
  }

  // Show empty state if no availability schedule exists
  if (!defaultSchedule) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 max-w-md mx-auto">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Set Your Availability</h3>
              <p className="text-gray-400 text-sm">
                Configure your working hours to let customers know when you're available for bookings.
              </p>
            </div>
            <button 
              onClick={async () => {
                await createDefaultSchedule();
                onChange();
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Configure Availability
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {DAYS.map((day) => {
        const dayAvailability = availability[day.key];
        const dayKey = day.key;
        const hasPendingUpdates = Array.from(pendingUpdates).some(id => id.startsWith(dayKey));
        const hasSyncingRules = Array.from(syncingRules).some(id => 
          // This would need access to rules to check properly, but we'll keep it simple for now
          false
        );
        
        return (
          <AvailabilityDayRow
            key={day.key}
            day={day}
            dayAvailability={dayAvailability}
            openDropdowns={openDropdowns}
            hasPendingUpdates={hasPendingUpdates}
            hasSyncingRules={hasSyncingRules}
            onUpdateDayEnabled={updateDayEnabled}
            onUpdateTimeBlock={updateTimeBlock}
            onAddTimeBlock={addTimeBlock}
            onRemoveTimeBlock={removeTimeBlock}
            onToggleDropdown={toggleDropdown}
            onCloseDropdown={closeDropdown}
          />
        );
      })}
    </div>
  );
};
