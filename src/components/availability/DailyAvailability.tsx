
import React, { useState, useEffect } from 'react';
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
  
  const { rules, createRule, updateRule, deleteRule } = useAvailabilityRules(defaultSchedule?.id);

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

  // Load existing rules from database when available
  useEffect(() => {
    if (rules.length > 0) {
      const newAvailability: Record<string, DayAvailability> = {};
      
      DAYS.forEach(day => {
        const dayRules = rules.filter(rule => rule.day_of_week === day.dayOfWeek);
        
        if (dayRules.length > 0) {
          // Has existing rules
          newAvailability[day.key] = {
            enabled: dayRules.some(rule => rule.is_available),
            timeBlocks: dayRules.map((rule, index) => ({
              id: `${day.key}-${index + 1}`,
              startTime: rule.start_time,
              endTime: rule.end_time
            }))
          };
        } else {
          // No existing rules, use defaults
          newAvailability[day.key] = {
            enabled: !day.isWeekend,
            timeBlocks: [{
              id: `${day.key}-1`,
              startTime: '08:00',
              endTime: '19:00'
            }]
          };
        }
      });
      
      setAvailability(newAvailability);
    }
  }, [rules]);

  const syncToDatabase = async (dayKey: string, dayData: DayAvailability) => {
    if (!defaultSchedule?.id) return;
    
    const day = DAYS.find(d => d.key === dayKey);
    if (!day) return;

    try {
      // Delete existing rules for this day
      const existingRules = rules.filter(rule => rule.day_of_week === day.dayOfWeek);
      for (const rule of existingRules) {
        await deleteRule(rule.id);
      }

      // Create new rules based on current state
      if (dayData.enabled && dayData.timeBlocks.length > 0) {
        for (const timeBlock of dayData.timeBlocks) {
          await createRule({
            day_of_week: day.dayOfWeek,
            start_time: timeBlock.startTime,
            end_time: timeBlock.endTime,
            is_available: true
          });
        }
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
    
    // Debounce the database sync to avoid too many calls
    setTimeout(() => {
      syncToDatabase(dayKey, newAvailability[dayKey]);
    }, 500);
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
