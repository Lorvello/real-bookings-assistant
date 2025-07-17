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

// Convert 24-hour time to 12-hour display and AM/PM
const convertTo12Hour = (time24: string) => {
  const [hours, minutes] = time24.split(':').map(Number);
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return { hour12, ampm };
};

// Convert 12-hour time + AM/PM to 24-hour format
const convertTo24Hour = (hour12: number, ampm: string) => {
  if (ampm === 'AM') {
    return hour12 === 12 ? 0 : hour12;
  } else {
    return hour12 === 12 ? 12 : hour12 + 12;
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  
  const formattedValue = formatTimeToHHMM(value);
  const [hours, minutes] = formattedValue.split(':').map(Number);
  const { hour12, ampm } = convertTo12Hour(formattedValue);
  
  // Calculate angles for clock hands
  const hourAngle = (hour12 * 30) + (minutes * 0.5); // 30 degrees per hour + minute adjustment
  const minuteAngle = minutes * 6; // 6 degrees per minute
  
  useEffect(() => {
    setInputValue(formattedValue);
  }, [formattedValue]);

  // Simplified drag handling
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

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleEnd, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
    };
  }, [isDragging, isSelectingMinutes, ampm]);

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
    let newHours = hours;
    let newMinutes = minutes;
    
    if (isSelectingMinutes) {
      newMinutes = Math.round((angle / 6) / 5) * 5; // Snap to 5-minute intervals
      newMinutes = Math.max(0, Math.min(59, newMinutes));
    } else {
      const clockHour = Math.round(angle / 30) % 12;
      const hour12Value = clockHour === 0 ? 12 : clockHour;
      newHours = convertTo24Hour(hour12Value, ampm);
    }
    
    const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    onChange(newTime);
  };

  const handleClockClick = (event: React.MouseEvent) => {
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

  const handleAmPmToggle = () => {
    const newAmPm = ampm === 'AM' ? 'PM' : 'AM';
    const newHours = convertTo24Hour(hour12, newAmPm);
    const newTime = `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(newTime);
  };

  // Generate clean 12-hour clock numbers (1-12 only)
  const generateClockNumbers = () => {
    const numbers = [];
    
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30) - 90; // -90 to start at 12 o'clock
      const radius = 45;
      const x = Math.cos(angle * Math.PI / 180) * radius;
      const y = Math.sin(angle * Math.PI / 180) * radius;
      
      numbers.push(
        <div
          key={i}
          className="absolute text-lg font-semibold text-foreground select-none cursor-pointer hover:text-primary transition-colors flex items-center justify-center"
          style={{
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            width: '24px',
            height: '24px',
            transform: 'translate(-50%, -50%)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            const newHours = convertTo24Hour(i, ampm);
            const newTime = `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            onChange(newTime);
          }}
        >
          {i}
        </div>
      );
    }
    return numbers;
  };

  // Generate minute marks (00, 05, 10, 15, etc.)
  const generateMinuteMarks = () => {
    const marks = [];
    for (let i = 0; i < 60; i += 5) {
      const angle = (i * 6) - 90; // -90 to start at 12 o'clock
      const radius = 45;
      const x = Math.cos(angle * Math.PI / 180) * radius;
      const y = Math.sin(angle * Math.PI / 180) * radius;
      marks.push(
        <div
          key={i}
          className="absolute text-sm font-medium text-foreground/70 select-none cursor-pointer hover:text-primary transition-colors flex items-center justify-center"
          style={{
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            width: '20px',
            height: '20px',
            transform: 'translate(-50%, -50%)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            const newTime = `${hours.toString().padStart(2, '0')}:${i.toString().padStart(2, '0')}`;
            onChange(newTime);
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
            // Real-time typing validation
            const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
            if (timeRegex.test(value)) {
              onChange(value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
              if (timeRegex.test(inputValue)) {
                onChange(inputValue);
              }
              onClose();
            }
          }}
          onFocus={(e) => {
            e.stopPropagation();
            // Don't auto-open modal when typing
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="09:00"
          className="font-mono text-center bg-background border-border hover:border-accent focus:border-accent focus:ring-accent/20 transition-all duration-200"
        />
      </div>
      
      {/* Clean Modal Interface */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <div 
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
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
                  {/* Clean Clock Interface */}
                  <div className="flex flex-col items-center space-y-4">
                     <div 
                       ref={clockRef}
                       className="relative w-64 h-64 bg-gradient-to-br from-background to-muted/20 rounded-full border-4 border-border/60 cursor-pointer hover:border-primary/60 transition-all duration-300 shadow-lg"
                       onClick={handleClockClick}
                     >
                       {/* Clock face inner circle */}
                       <div className="absolute inset-4 rounded-full bg-background border-2 border-border/30 shadow-inner">
                         {/* Clean numbers - only 12-hour display */}
                         {isSelectingMinutes ? generateMinuteMarks() : generateClockNumbers()}
                         
                         {/* Center dot */}
                         <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20 shadow-lg" />
                         
                         {/* Hour hand */}
                         {!isSelectingMinutes && (
                           <>
                             <div
                               className="absolute top-1/2 left-1/2 origin-bottom bg-primary rounded-full z-10 shadow-lg transition-transform duration-200"
                               style={{
                                 width: '4px',
                                 height: '40px',
                                 transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`,
                                 transformOrigin: 'bottom center'
                               }}
                             />
                              {/* Hour hand circle */}
                              <div
                                className="absolute top-1/2 left-1/2 w-4 h-4 bg-primary rounded-full z-15 shadow-lg transition-transform duration-200 cursor-grab active:cursor-grabbing hover:scale-110"
                                style={{
                                  transform: `translate(-50%, -50%) translate(${Math.cos((hourAngle - 90) * Math.PI / 180) * 35}px, ${Math.sin((hourAngle - 90) * Math.PI / 180) * 35}px)`
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
                                 height: '50px',
                                 transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`,
                                 transformOrigin: 'bottom center'
                               }}
                             />
                              {/* Minute hand circle */}
                              <div
                                className="absolute top-1/2 left-1/2 w-3 h-3 bg-primary rounded-full z-15 shadow-lg transition-transform duration-200 cursor-grab active:cursor-grabbing hover:scale-110"
                                style={{
                                  transform: `translate(-50%, -50%) translate(${Math.cos((minuteAngle - 90) * Math.PI / 180) * 45}px, ${Math.sin((minuteAngle - 90) * Math.PI / 180) * 45}px)`
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
                  
                  {/* Controls */}
                  <div className="space-y-4">
                    {/* Hour/Minute Toggle */}
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant={!isSelectingMinutes ? "default" : "outline"}
                        size="lg"
                        onClick={() => setIsSelectingMinutes(false)}
                        className="min-w-[80px]"
                      >
                        Hours
                      </Button>
                      <Button
                        variant={isSelectingMinutes ? "default" : "outline"}
                        size="lg"
                        onClick={() => setIsSelectingMinutes(true)}
                        className="min-w-[80px]"
                      >
                        Minutes
                      </Button>
                    </div>
                    
                    {/* AM/PM Toggle */}
                    <div className="flex items-center justify-center">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleAmPmToggle}
                        className="min-w-[80px] font-semibold"
                      >
                        {ampm}
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
                  // Immediate save without delay
                  let finalTime = formattedValue;
                  
                  if (mode === 'input') {
                    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
                    if (timeRegex.test(inputValue)) {
                      finalTime = inputValue;
                    }
                  }
                  
                  console.log('Setting time to:', finalTime);
                  
                  // Force the change to trigger immediately
                  onChange(finalTime);
                  
                  // Close modal immediately
                  onClose();
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