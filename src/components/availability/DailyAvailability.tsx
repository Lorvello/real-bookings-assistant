import React, { useState, useEffect } from 'react';
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
    
    const existingTimeout = debounceTimeouts.get(dayKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
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
    
    const timeoutKey = `${dayKey}-${blockId}-${field}`;
    const existingTimeout = debounceTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
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
    
    let newStartTime = lastBlock?.endTime || '09:00';
    let newEndTime = '17:00';
    
    if (newStartTime >= '17:00') {
      newStartTime = '08:00';
      newEndTime = '12:00';
    }

    const newTimeBlock = {
      id: newBlockId,
      startTime: newStartTime,
      endTime: newEndTime
    };

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
    await syncToDatabase(dayKey, newAvailability[dayKey]);
  };

  const removeTimeBlock = async (dayKey: string, blockId: string) => {
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
    await syncToDatabase(dayKey, newAvailability[dayKey]);
  };

  const copyDayToNext = (dayKey: string) => {
    const dayIndex = DAYS.findIndex(d => d.key === dayKey);
    if (dayIndex === -1 || dayIndex >= DAYS.length - 1) return;
    
    const nextDay = DAYS[dayIndex + 1];
    const currentDayData = availability[dayKey];
    
    // Copy time blocks with new IDs
    const copiedBlocks = currentDayData.timeBlocks.map(block => ({
      ...block,
      id: `${nextDay.key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    
    const newAvailability = {
      ...availability,
      [nextDay.key]: {
        enabled: currentDayData.enabled,
        timeBlocks: copiedBlocks
      }
    };
    
    setAvailability(newAvailability);
    syncToDatabase(nextDay.key, newAvailability[nextDay.key]);
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

  // Auto-create schedule if calendar exists but no schedule
  useEffect(() => {
    const initSchedule = async () => {
      if (defaultCalendar && !defaultSchedule) {
        try {
          await createDefaultSchedule();
        } catch (error) {
          console.error('Failed to auto-create schedule:', error);
        }
      }
    };
    initSchedule();
  }, [defaultCalendar?.id, defaultSchedule?.id]);

  if (!defaultCalendar) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show loading while schedule is being created
  if (!defaultSchedule) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/30">
      {DAYS.map((day) => {
        const dayAvailability = availability[day.key];
        const dayKey = day.key;
        const hasPendingUpdates = Array.from(pendingUpdates).some(id => id.startsWith(dayKey));
        const hasSyncingRules = false;
        
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
            onCopyDay={copyDayToNext}
            onToggleDropdown={toggleDropdown}
            onCloseDropdown={closeDropdown}
          />
        );
      })}
    </div>
  );
};
