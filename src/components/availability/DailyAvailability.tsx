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
    syncToDatabase
  } = useDailyAvailabilityManager(onChange);

  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

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
