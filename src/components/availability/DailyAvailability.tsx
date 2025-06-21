
import React, { useState, useEffect, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';

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
  onClose: () => void;
}

const TimeDropdown: React.FC<TimeDropdownProps> = ({ value, onChange, isOpen, onToggle, onClose }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={handleButtonClick}
        type="button"
        className="w-20 h-12 text-sm bg-gray-800 border-gray-600 text-white hover:bg-gray-700 focus:border-teal-500 focus:ring-teal-500 flex items-center justify-between px-3"
      >
        <span>{value}</span>
        <ChevronDown className={`h-3 w-3 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>
      
      <div
        className={`absolute top-full left-0 w-20 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 transition-all duration-200 ease-out ${
          isOpen 
            ? 'opacity-100 scale-100 max-h-48 overflow-y-auto' 
            : 'opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none'
        }`}
      >
        {TIME_OPTIONS.map((time) => (
          <button
            key={time}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(time);
              onClose();
            }}
            type="button"
            className={`w-full px-3 py-1.5 text-sm text-left hover:bg-gray-700 transition-colors duration-150 ${
              time === value ? 'bg-gray-700 text-teal-400' : 'text-white'
            }`}
          >
            {time}
          </button>
        ))}
      </div>
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

  const closeAllDropdowns = () => {
    setOpenDropdowns({});
  };

  return (
    <div className="space-y-6">
      {DAYS.map((day) => {
        const dayAvailability = availability[day.key];
        
        return (
          <div key={day.key} className="space-y-3">
            {/* Day header with toggle and name */}
            <div className="flex items-center justify-between">
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

              {/* Add new time slot button - only show when enabled */}
              {dayAvailability.enabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTimeBlock(day.key)}
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 text-xs px-3 py-1 h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add new time slot
                </Button>
              )}
            </div>

            {/* Time blocks */}
            {dayAvailability.enabled && (
              <div className="space-y-2 ml-12">
                {dayAvailability.timeBlocks.map((block, index) => {
                  const startDropdownId = `${day.key}-${block.id}-start`;
                  const endDropdownId = `${day.key}-${block.id}-end`;
                  
                  return (
                    <div key={block.id} className="flex items-center space-x-4">
                      {/* Time dropdowns */}
                      <div className="flex items-center space-x-4">
                        <TimeDropdown
                          value={block.startTime}
                          onChange={(value) => updateTimeBlock(day.key, block.id, 'startTime', value)}
                          isOpen={openDropdowns[startDropdownId] || false}
                          onToggle={() => toggleDropdown(startDropdownId)}
                          onClose={() => closeDropdown(startDropdownId)}
                        />
                        <span className="text-gray-400 text-lg">-</span>
                        <TimeDropdown
                          value={block.endTime}
                          onChange={(value) => updateTimeBlock(day.key, block.id, 'endTime', value)}
                          isOpen={openDropdowns[endDropdownId] || false}
                          onToggle={() => toggleDropdown(endDropdownId)}
                          onClose={() => closeDropdown(endDropdownId)}
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2">
                        {/* Add button for additional time slots */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addTimeBlock(day.key)}
                          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 p-2 h-8 w-8"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>

                        {/* Delete button - only show if more than one time block */}
                        {dayAvailability.timeBlocks.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTimeBlock(day.key, block.id)}
                            className="bg-gray-800 border-gray-600 text-red-400 hover:bg-red-900/20 hover:border-red-500 p-2 h-8 w-8"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
