
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

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

// Generate time options in 15-minute intervals
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      times.push(timeString);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

interface TimeDropdownProps {
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const TimeDropdown: React.FC<TimeDropdownProps> = ({ value, onChange, isOpen, onToggle }) => {
  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={onToggle}
        className="w-20 h-12 text-sm bg-gray-800 border-gray-600 text-white hover:bg-gray-700 focus:border-teal-500 focus:ring-teal-500 flex items-center justify-between px-3"
      >
        <span>{value}</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full left-0 w-20 max-h-48 overflow-y-auto bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {TIME_OPTIONS.map((time) => (
            <button
              key={time}
              onClick={() => {
                onChange(time);
                onToggle();
              }}
              className={`w-full px-3 py-1.5 text-sm text-left hover:bg-gray-700 transition-colors ${
                time === value ? 'bg-gray-700 text-teal-400' : 'text-white'
              }`}
            >
              {time}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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

  const toggleDropdown = (dropdownId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdownId]: !prev[dropdownId]
    }));
  };

  return (
    <div className="space-y-6">
      {DAYS.map((day) => {
        const dayAvailability = availability[day.key];
        const firstBlock = dayAvailability.timeBlocks[0];
        const startDropdownId = `${day.key}-start`;
        const endDropdownId = `${day.key}-end`;
        
        return (
          <div key={day.key} className="flex items-center justify-between">
            {/* Left side - Toggle and Day name */}
            <div className="flex items-center space-x-4 min-w-[160px]">
              <Switch
                checked={dayAvailability.enabled}
                onCheckedChange={(enabled) => updateDayEnabled(day.key, enabled)}
                className="scale-110"
              />
              <span className={`text-base font-medium ${
                dayAvailability.enabled 
                  ? 'text-white' 
                  : 'text-gray-400'
              }`}>
                {day.label}
              </span>
            </div>

            {/* Right side - Time dropdowns */}
            <div className="flex items-center space-x-4">
              {dayAvailability.enabled && firstBlock ? (
                <>
                  <TimeDropdown
                    value={firstBlock.startTime}
                    onChange={(value) => updateTimeBlock(day.key, firstBlock.id, 'startTime', value)}
                    isOpen={openDropdowns[startDropdownId] || false}
                    onToggle={() => toggleDropdown(startDropdownId)}
                  />
                  <span className="text-gray-400 text-lg">-</span>
                  <TimeDropdown
                    value={firstBlock.endTime}
                    onChange={(value) => updateTimeBlock(day.key, firstBlock.id, 'endTime', value)}
                    isOpen={openDropdowns[endDropdownId] || false}
                    onToggle={() => toggleDropdown(endDropdownId)}
                  />
                </>
              ) : (
                <div className="w-48" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
