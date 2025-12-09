
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CompactTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

// Helper function to format time to HH:MM format
const formatTimeToHHMM = (timeString: string): string => {
  if (!timeString) return '09:00';
  
  // If already in HH:MM format, return as is
  if (timeString.match(/^\d{2}:\d{2}$/)) {
    return timeString;
  }
  
  // If in HH:MM:SS format, strip seconds
  if (timeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
    return timeString.substring(0, 5);
  }
  
  return timeString;
};

// Generate time options in 15-minute intervals
const generateTimeOptions = () => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push(time);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

export const CompactTimePicker: React.FC<CompactTimePickerProps> = ({
  value,
  onChange,
  isOpen,
  onToggle,
  onClose
}) => {
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const formattedValue = formatTimeToHHMM(value);
  
  useEffect(() => {
    setInputValue(formattedValue);
  }, [formattedValue]);

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

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = event.target.value;
    setInputValue(inputVal);
    
    // Real-time validation and update
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (timeRegex.test(inputVal)) {
      onChange(inputVal);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (timeRegex.test(inputValue)) {
        onChange(inputValue);
      }
      onClose();
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  const handleInputBlur = () => {
    // Validate and format on blur
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (timeRegex.test(inputValue)) {
      const [hours, minutes] = inputValue.split(':');
      const formatted = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      setInputValue(formatted);
      onChange(formatted);
    } else {
      // Reset to previous valid value
      setInputValue(formattedValue);
    }
  };

  const handleTimeSelect = (time: string) => {
    onChange(time);
    setInputValue(time);
    onClose();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        onBlur={handleInputBlur}
        onClick={onToggle}
        placeholder="09:00"
        className="w-20 h-9 text-center text-sm font-medium bg-muted/50 border-border/50 hover:border-border focus:border-primary rounded-lg cursor-pointer"
      />
      
      {/* Dropdown with time options */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <ScrollArea className="h-48 w-24">
            <div className="p-1">
              {TIME_OPTIONS.map((time) => (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  className={`w-full px-3 py-1.5 text-sm text-left rounded hover:bg-accent transition-colors ${
                    time === formattedValue ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
