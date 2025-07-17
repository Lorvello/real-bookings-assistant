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

// Convert time to angle for clock hands (24-hour support)
const timeToAngle = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  // For 24-hour support: show inner ring for 13-24 hours, outer for 1-12
  const displayHour = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
  const hourAngle = (displayHour * 30) + (minutes * 0.5); // 30 degrees per hour + minute adjustment
  const minuteAngle = minutes * 6; // 6 degrees per minute
  return { hourAngle, minuteAngle, is24Hour: hours > 12 || hours === 0 };
};

// Convert angle to time (24-hour support)
const angleToTime = (angle: number, isHour: boolean, currentHour?: number) => {
  if (isHour) {
    const hour12 = Math.round(angle / 30) % 12;
    return hour12 === 0 ? 12 : hour12;
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
  const [isDragging, setIsDragging] = useState(false);
  const [is24HourMode, setIs24HourMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  
  const formattedValue = formatTimeToHHMM(value);
  const { hourAngle, minuteAngle, is24Hour } = timeToAngle(formattedValue);
  
  // Auto-detect 24-hour mode based on current time
  useEffect(() => {
    const [hours] = formattedValue.split(':').map(Number);
    setIs24HourMode(hours > 12 || hours === 0);
  }, [formattedValue]);
  
  useEffect(() => {
    setInputValue(formattedValue);
  }, [formattedValue]);

  // CRITICAL FIX: Simplified drag handling to prevent website freeze
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!clockRef.current) return;
      
      const rect = clockRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const x = clientX - centerX;
      const y = clientY - centerY;
      
      let angle = Math.atan2(y, x) * 180 / Math.PI;
      angle = (angle + 90 + 360) % 360;
      
      updateTimeFromAngle(angle);
    };

    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      handleMove(event.clientX, event.clientY);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    // Only add essential event listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleEnd, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
    };
  }, [isDragging]);

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

  const updateTimeFromAngle = (angle: number) => {
    const currentTime = formattedValue.split(':').map(Number);
    let newHours = currentTime[0];
    let newMinutes = currentTime[1];
    
    if (isSelectingMinutes) {
      newMinutes = Math.round(angleToTime(angle, false) / 5) * 5; // Snap to 5-minute intervals
      newMinutes = Math.max(0, Math.min(59, newMinutes));
    } else {
      const hour12 = angleToTime(angle, true, currentTime[0]);
      
      if (is24HourMode) {
        // For 24-hour mode: add 12 to get afternoon hours (13-24)
        newHours = hour12 === 12 ? 12 : hour12 + 12;
      } else {
        // For regular mode: handle AM/PM based on current context
        if (currentTime[0] >= 12 && hour12 !== 12) {
          newHours = hour12 + 12;
        } else if (currentTime[0] < 12 && hour12 === 12) {
          newHours = 0;
        } else {
          newHours = hour12 === 12 ? 12 : hour12;
        }
      }
      
      newHours = Math.max(0, Math.min(23, newHours));
    }
    
    const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    onChange(newTime);
  };

  const handleClockClick = (event: React.MouseEvent) => {
    // CRITICAL FIX: Simplified click handling to prevent conflicts
    if (!clockRef.current || isDragging) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = event.clientX - centerX;
    const y = event.clientY - centerY;
    
    let angle = Math.atan2(y, x) * 180 / Math.PI;
    angle = (angle + 90 + 360) % 360;
    
    updateTimeFromAngle(angle);
  };

  const handleHandStart = (event: React.MouseEvent, selectingMinutes: boolean) => {
    // CRITICAL FIX: Simplified event handling to prevent freeze
    event.preventDefault();
    event.stopPropagation();
    setIsSelectingMinutes(selectingMinutes);
    setIsDragging(true);
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
    const currentHour = parseInt(formattedValue.split(':')[0]);
    
    // Show both 12-hour and 24-hour numbers for better UX
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30) - 90; // -90 to start at 12 o'clock
      const x = Math.cos(angle * Math.PI / 180) * 35;
      const y = Math.sin(angle * Math.PI / 180) * 35;
      
      // Show outer ring number (1-12)
      hours.push(
        <div
          key={`outer-${i}`}
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
      
      // Show inner ring numbers (13-24) for 24-hour support
      const innerX = Math.cos(angle * Math.PI / 180) * 22;
      const innerY = Math.sin(angle * Math.PI / 180) * 22;
      const inner24Hour = i === 12 ? 0 : i + 12;
      
      hours.push(
        <div
          key={`inner-${inner24Hour}`}
          className="absolute text-xs font-medium text-foreground/60 select-none cursor-pointer hover:text-foreground transition-colors"
          style={{
            left: `calc(50% + ${innerX}px - 6px)`,
            top: `calc(50% + ${innerY}px - 6px)`,
            width: '12px',
            height: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={(e) => {
            e.stopPropagation();
            const minutes = formattedValue.split(':')[1];
            const newTime = `${inner24Hour.toString().padStart(2, '0')}:${minutes}`;
            onChange(newTime);
          }}
        >
          {inner24Hour.toString().padStart(2, '0')}
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
    <>
      <div className="relative" ref={dropdownRef}>
        <Input
          value={formattedValue}
          onChange={(e) => {
            const value = e.target.value;
            setInputValue(value);
            const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
            if (timeRegex.test(value)) {
              onChange(value);
            }
          }}
          onFocus={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="09:00"
          className="font-mono text-center bg-background border-border hover:border-accent focus:border-accent focus:ring-accent/20 transition-all duration-200"
        />
      </div>
      
      {/* Professional Modal Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
          onClick={(e) => {
            // Only close if clicking the overlay itself, not the modal content
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <div 
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 animate-in fade-in-0 zoom-in-95 relative"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Select Time</h2>
              <div className="flex items-center space-x-1 bg-muted/50 rounded-lg p-0.5">
                <button
                  onClick={() => setMode('clock')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    mode === 'clock' 
                      ? 'bg-accent text-accent-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                  }`}
                >
                  <Clock className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setMode('input')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    mode === 'input' 
                      ? 'bg-accent text-accent-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                  }`}
                >
                  <Type className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {mode === 'clock' ? (
                <div className="space-y-6">
                  {/* Professional Clock Interface */}
                  <div className="flex flex-col items-center space-y-4">
                     <div 
                       ref={clockRef}
                       className="relative w-64 h-64 bg-gradient-to-br from-background to-muted/20 rounded-full border-4 border-border/60 cursor-pointer hover:border-primary/60 transition-all duration-300 shadow-lg"
                       onClick={(e) => {
                         e.stopPropagation();
                         handleClockClick(e);
                       }}
                     >
                       {/* Clock face inner circle */}
                       <div className="absolute inset-4 rounded-full bg-background border-2 border-border/30 shadow-inner">
                         {/* Hour numbers or minute marks */}
                         {isSelectingMinutes ? generateMinuteMarks() : generateHourNumbers()}
                         
                         {/* Center dot */}
                         <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20 shadow-lg" />
                         
                         {/* Hour hand */}
                         {!isSelectingMinutes && (
                           <>
                             <div
                               className="absolute top-1/2 left-1/2 origin-bottom bg-primary rounded-full z-10 shadow-lg transition-transform duration-200"
                               style={{
                                 width: '4px',
                                 height: '45px',
                                 transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`,
                                 transformOrigin: 'bottom center'
                               }}
                             />
                              {/* Hour hand circle */}
                              <div
                                className="absolute top-1/2 left-1/2 w-4 h-4 bg-primary rounded-full z-15 shadow-lg transition-transform duration-200 cursor-grab active:cursor-grabbing hover:scale-110"
                                style={{
                                  transform: `translate(-50%, -50%) translate(${Math.cos((hourAngle - 90) * Math.PI / 180) * 40}px, ${Math.sin((hourAngle - 90) * Math.PI / 180) * 40}px)`
                                }}
                                 onMouseDown={(e) => handleHandStart(e, false)}
                              />
                           </>
                         )}
                         
                         {/* Minute hand */}
                         {isSelectingMinutes && (
                           <>
                             <div
                               className="absolute top-1/2 left-1/2 origin-bottom bg-primary rounded-full z-10 shadow-lg transition-transform duration-200"
                               style={{
                                 width: '3px',
                                 height: '60px',
                                 transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`,
                                 transformOrigin: 'bottom center'
                               }}
                             />
                              {/* Minute hand circle */}
                              <div
                                className="absolute top-1/2 left-1/2 w-3 h-3 bg-primary rounded-full z-15 shadow-lg transition-transform duration-200 cursor-grab active:cursor-grabbing hover:scale-110"
                                style={{
                                  transform: `translate(-50%, -50%) translate(${Math.cos((minuteAngle - 90) * Math.PI / 180) * 55}px, ${Math.sin((minuteAngle - 90) * Math.PI / 180) * 55}px)`
                                }}
                                 onMouseDown={(e) => handleHandStart(e, true)}
                              />
                           </>
                         )}
                       </div>
                     </div>
                    
                    {/* Current time display */}
                    <div className="text-center">
                      <div className="text-3xl font-mono font-bold text-foreground mb-1">
                        {formattedValue}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {isSelectingMinutes ? 'Select minutes' : 'Select hours'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Hour/Minute Toggle and 24-Hour Mode */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant={!isSelectingMinutes ? "default" : "outline"}
                        size="lg"
                        onClick={() => setIsSelectingMinutes(false)}
                        className={`min-w-[80px] ${!isSelectingMinutes ? 'bg-primary hover:bg-primary/90' : ''}`}
                      >
                        Hours
                      </Button>
                      <Button
                        variant={isSelectingMinutes ? "default" : "outline"}
                        size="lg"
                        onClick={() => setIsSelectingMinutes(true)}
                        className={`min-w-[80px] ${isSelectingMinutes ? 'bg-primary hover:bg-primary/90' : ''}`}
                      >
                        Minutes
                      </Button>
                    </div>
                    
                    {/* 24-Hour Mode Toggle */}
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant={!is24HourMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIs24HourMode(false)}
                        className="min-w-[60px] text-xs"
                      >
                        AM/PM
                      </Button>
                      <Button
                        variant={is24HourMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIs24HourMode(true)}
                        className="min-w-[60px] text-xs"
                      >
                        24H
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Direct Input Interface */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">
                      Enter time (24-hour format)
                    </label>
                    <Input
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleInputKeyDown}
                      onFocus={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="09:00"
                      className="font-mono text-center text-lg bg-background border-border focus:border-accent focus:ring-accent/20 h-12"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Examples: 09:00, 14:30, 23:45
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-border bg-muted/20">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-6"
              >
                Cancel
              </Button>
                <Button
                onClick={() => {
                  // CRITICAL FIX: Ensure time is properly saved
                  let finalTime = formattedValue;
                  
                  if (mode === 'input') {
                    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
                    if (timeRegex.test(inputValue)) {
                      finalTime = inputValue;
                    }
                  }
                  
                  // Force the change to trigger
                  onChange(finalTime);
                  
                  // Close modal after a brief delay to ensure save completes
                  setTimeout(() => {
                    onClose();
                  }, 100);
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
              >
                Set Time
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};