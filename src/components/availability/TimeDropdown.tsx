
import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

// Generate time options in 15-minute intervals (HH:MM format only)
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

export const TimeDropdown: React.FC<TimeDropdownProps> = ({ 
  value, 
  onChange, 
  isOpen, 
  onToggle, 
  onClose 
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const formattedValue = formatTimeToHHMM(value);

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

  const handleTimeSelect = (time: string) => {
    onChange(time); // Always pass HH:MM format
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={handleButtonClick}
        type="button"
        className="w-18 h-10 text-sm bg-gray-800 border-gray-600 text-white hover:bg-gray-700 focus:border-teal-500 focus:ring-teal-500 flex items-center justify-between px-3"
      >
        <span>{formattedValue}</span>
        <ChevronDown className={`h-3 w-3 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>
      
      <div
        className={`absolute top-full left-0 w-18 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 transition-all duration-200 ease-out ${
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
              handleTimeSelect(time);
              onClose();
            }}
            type="button"
            className={`w-full px-3 py-1.5 text-sm text-left hover:bg-gray-700 transition-colors duration-150 ${
              time === formattedValue ? 'bg-gray-700 text-teal-400' : 'text-white'
            }`}
          >
            {time}
          </button>
        ))}
      </div>
    </div>
  );
};
