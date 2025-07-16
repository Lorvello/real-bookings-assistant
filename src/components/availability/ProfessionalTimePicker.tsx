import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Type } from 'lucide-react';

interface ProfessionalTimePickerProps {
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

// Convert time to angle for clock hands
const timeToAngle = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const hourAngle = ((hours % 12) * 30) + (minutes * 0.5); // 30 degrees per hour + minute adjustment
  const minuteAngle = minutes * 6; // 6 degrees per minute
  return { hourAngle, minuteAngle };
};

// Convert angle to time
const angleToTime = (angle: number, isHour: boolean) => {
  if (isHour) {
    return Math.round(angle / 30) % 12;
  } else {
    return Math.round(angle / 6) % 60;
  }
};

export const ProfessionalTimePicker: React.FC<ProfessionalTimePickerProps> = ({
  value,
  onChange,
  isOpen,
  onToggle,
  onClose
}) => {
  const [mode, setMode] = useState<'clock' | 'input'>('clock');
  const [inputValue, setInputValue] = useState('');
  const [isSelectingMinutes, setIsSelectingMinutes] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  
  const formattedValue = formatTimeToHHMM(value);
  const { hourAngle, minuteAngle } = timeToAngle(formattedValue);
  
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

  const handleClockClick = (event: React.MouseEvent) => {
    if (!clockRef.current) return;
    
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = event.clientX - centerX;
    const y = event.clientY - centerY;
    
    let angle = Math.atan2(y, x) * 180 / Math.PI;
    angle = (angle + 90 + 360) % 360; // Normalize to 0-360 with 12 o'clock as 0
    
    const currentTime = formattedValue.split(':').map(Number);
    let newHours = currentTime[0];
    let newMinutes = currentTime[1];
    
    if (isSelectingMinutes) {
      newMinutes = angleToTime(angle, false);
    } else {
      const newHour = angleToTime(angle, true);
      newHours = newHour === 0 ? 12 : newHour;
      if (currentTime[0] >= 12) newHours += 12;
      newHours = newHours % 24;
    }
    
    const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    onChange(newTime);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = event.target.value;
    setInputValue(inputVal);
    
    // Validate and format the input
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
        onClose();
      }
    }
  };

  const generateHourNumbers = () => {
    const hours = [];
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30) - 90; // -90 to start at 12 o'clock
      const x = Math.cos(angle * Math.PI / 180) * 35;
      const y = Math.sin(angle * Math.PI / 180) * 35;
      hours.push(
        <div
          key={i}
          className="absolute text-xs font-medium text-foreground/80 select-none"
          style={{
            left: `calc(50% + ${x}px - 6px)`,
            top: `calc(50% + ${y}px - 6px)`,
            width: '12px',
            height: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {i}
        </div>
      );
    }
    return hours;
  };

  const generateMinuteMarks = () => {
    const marks = [];
    for (let i = 0; i < 60; i += 5) {
      const angle = (i * 6) - 90; // -90 to start at 12 o'clock
      const x = Math.cos(angle * Math.PI / 180) * 42;
      const y = Math.sin(angle * Math.PI / 180) * 42;
      marks.push(
        <div
          key={i}
          className="absolute text-xs font-medium text-foreground/60 select-none"
          style={{
            left: `calc(50% + ${x}px - 6px)`,
            top: `calc(50% + ${y}px - 6px)`,
            width: '12px',
            height: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {i.toString().padStart(2, '0')}
        </div>
      );
    }
    return marks;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={onToggle}
        type="button"
        className="h-9 px-3 bg-card/80 border-border/60 text-foreground hover:bg-card/90 hover:border-primary/40 transition-all duration-200 shadow-sm"
      >
        <span className="font-mono text-sm">{formattedValue}</span>
      </Button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-popover/95 backdrop-blur-sm border border-border/60 rounded-2xl shadow-xl shadow-black/10 z-50 p-4 min-w-[280px]">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Select Time</h3>
            <div className="flex items-center space-x-1 bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => setMode('clock')}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                  mode === 'clock' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Clock className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMode('input')}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                  mode === 'input' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Type className="h-4 w-4" />
              </button>
            </div>
          </div>

          {mode === 'clock' ? (
            <div className="space-y-4">
              {/* Clock Interface */}
              <div 
                ref={clockRef}
                className="relative w-48 h-48 mx-auto bg-card/50 rounded-full border-2 border-border/60 cursor-pointer hover:border-primary/40 transition-all duration-200"
                onClick={handleClockClick}
              >
                {/* Clock face */}
                <div className="absolute inset-2 rounded-full bg-background/80 border border-border/30">
                  {/* Hour numbers or minute marks */}
                  {isSelectingMinutes ? generateMinuteMarks() : generateHourNumbers()}
                  
                  {/* Center dot */}
                  <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10" />
                  
                  {/* Hour hand */}
                  {!isSelectingMinutes && (
                    <div
                      className="absolute top-1/2 left-1/2 origin-bottom bg-primary rounded-full z-10"
                      style={{
                        width: '3px',
                        height: '30px',
                        transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`,
                        transformOrigin: 'bottom center'
                      }}
                    />
                  )}
                  
                  {/* Minute hand */}
                  {isSelectingMinutes && (
                    <div
                      className="absolute top-1/2 left-1/2 origin-bottom bg-primary rounded-full z-10"
                      style={{
                        width: '2px',
                        height: '40px',
                        transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`,
                        transformOrigin: 'bottom center'
                      }}
                    />
                  )}
                </div>
              </div>
              
              {/* Hour/Minute Toggle */}
              <div className="flex items-center justify-center space-x-2">
                <Button
                  variant={!isSelectingMinutes ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsSelectingMinutes(false)}
                  className="min-w-[60px]"
                >
                  Hours
                </Button>
                <Button
                  variant={isSelectingMinutes ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsSelectingMinutes(true)}
                  className="min-w-[60px]"
                >
                  Minutes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Input Interface */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Enter time (HH:MM)
                </label>
                <Input
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  placeholder="09:00"
                  className="font-mono text-center bg-background/80 border-border/60 focus:border-primary/60 focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Use 24-hour format (e.g., 09:00, 14:30)
                </p>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (mode === 'input') {
                  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
                  if (timeRegex.test(inputValue)) {
                    onChange(inputValue);
                  }
                }
                onClose();
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Set Time
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};