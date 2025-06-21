
import React, { useState } from 'react';
import { DayRow } from './DayRow';

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
  { key: 'monday', label: 'Monday', isWeekend: false },
  { key: 'tuesday', label: 'Tuesday', isWeekend: false },
  { key: 'wednesday', label: 'Wednesday', isWeekend: false },
  { key: 'thursday', label: 'Thursday', isWeekend: false },
  { key: 'friday', label: 'Friday', isWeekend: false },
  { key: 'saturday', label: 'Saturday', isWeekend: true },
  { key: 'sunday', label: 'Sunday', isWeekend: true }
];

export const DailyAvailability: React.FC<DailyAvailabilityProps> = ({ onChange }) => {
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

  const updateDayEnabled = (dayKey: string, enabled: boolean) => {
    setAvailability(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], enabled }
    }));
    onChange();
  };

  const updateTimeBlock = (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeBlocks: prev[dayKey].timeBlocks.map(block =>
          block.id === blockId ? { ...block, [field]: value } : block
        )
      }
    }));
    onChange();
  };

  const addTimeBlock = (dayKey: string) => {
    setAvailability(prev => {
      const currentBlocks = prev[dayKey].timeBlocks;
      const newBlockId = `${dayKey}-${currentBlocks.length + 1}`;
      const lastBlock = currentBlocks[currentBlocks.length - 1];
      
      return {
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
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
    });
    onChange();
  };

  const removeTimeBlock = (dayKey: string, blockId: string) => {
    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeBlocks: prev[dayKey].timeBlocks.filter(block => block.id !== blockId)
      }
    }));
    onChange();
  };

  const toggleDropdown = (dropdownId: string) => {
    console.log('Toggling dropdown:', dropdownId, 'Current state:', openDropdowns[dropdownId]);
    setOpenDropdowns(prev => {
      // Close all other dropdowns when opening a new one
      const newState: Record<string, boolean> = {};
      Object.keys(prev).forEach(key => {
        newState[key] = false;
      });
      // Toggle the clicked dropdown
      newState[dropdownId] = !prev[dropdownId];
      console.log('New dropdown state:', newState);
      return newState;
    });
  };

  const closeDropdown = (dropdownId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdownId]: false
    }));
  };

  return (
    <div className="space-y-6">
      {DAYS.map((day) => {
        const dayAvailability = availability[day.key];
        
        return (
          <DayRow
            key={day.key}
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
        );
      })}
    </div>
  );
};
