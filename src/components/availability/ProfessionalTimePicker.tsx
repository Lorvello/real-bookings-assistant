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
  if (!timeString) return '00:00';
  
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

// Convert time to angle for 24-hour clock hands - aligned with number positions
const timeToAngle = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  
  // Calculate hour angle to match exact number positions on clock face
  let hourAngle;
  if (hours === 0) {
    hourAngle = (12 * 30) - 90; // 00:00 points to 12 o'clock position
  } else if (hours <= 12) {
    hourAngle = (hours * 30) - 90; // Hours 1-12 point to their exact positions
  } else {
    // Hours 13-23 point to their corresponding 1-11 positions
    hourAngle = ((hours - 12) * 30) - 90;
  }
  
  const minuteAngle = (minutes * 6) - 90; // Minutes aligned with minute marks
  return { hourAngle, minuteAngle };
};

// Convert angle to time for 24-hour clock
const angleToTime = (angle: number, isHour: boolean) => {
  if (isHour) {
    // Reverse the 180-degree shift applied in timeToAngle
    const adjustedAngle = (angle - 180 + 360) % 360;
    const hour24 = Math.round(adjustedAngle / 15) % 24;
    return hour24;
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
  const [inputValue, setInputValue] = useState('');
  const [isSelectingMinutes, setIsSelectingMinutes] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  
  const formattedValue = formatTimeToHHMM(value);
  const { hourAngle, minuteAngle } = timeToAngle(formattedValue);
  
  useEffect(() => {
    setInputValue(formattedValue);
  }, [formattedValue]);

  // Optimized drag handling to prevent website freeze
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
      newHours = angleToTime(angle, true);
      newHours = Math.max(0, Math.min(23, newHours));
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
        onClose();
      }
    }
  };

  const generateHourNumbers = () => {
    const hours = [];
    
    // Generate outer ring (1-12 hours) - moved to edge of clock
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30) - 90; // -90 to start at 12 o'clock, 30 degrees apart
      const radius = 65; // MOVED outer ring much further out toward edge
      
      const x = Math.cos(angle * Math.PI / 180) * radius;
      const y = Math.sin(angle * Math.PI / 180) * radius;
      
      hours.push(
        <div
          key={`outer-${i}`}
          className="absolute select-none cursor-pointer hover:text-primary hover:scale-110 hover:bg-primary/10 hover:shadow-lg transition-all duration-200 flex items-center justify-center text-base font-semibold text-foreground rounded-full"
          style={{
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            width: '20px',
            height: '20px',
            transform: 'translate(-50%, -50%)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            const currentTime = formattedValue.split(':').map(Number);
            const minutes = currentTime[1];
            const newHours = i; // Direct mapping for hours 1-12
            
            const newTime = `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            onChange(newTime);
          }}
        >
          {i.toString().padStart(2, '0')}
        </div>
      );
    }
    
    // Generate inner ring with proper hour mapping (13-24, with 00 at 12 o'clock position)
    const innerHours = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]; // 0 at position 1 (top, midnight)
    for (let i = 0; i < 12; i++) {
      const position = i + 1; // Position 1-12 on clock face
      const actualHour = innerHours[i]; // Actual hour value (13-23, 0)
      const angle = (position * 30) - 90; // Same positions as outer ring
      const radius = 38; // MOVED inner ring midway between center and outer ring (65-38 = 27px separation)
      
      const x = Math.cos(angle * Math.PI / 180) * radius;
      const y = Math.sin(angle * Math.PI / 180) * radius;
      
      hours.push(
        <div
          key={`inner-${actualHour}`}
          className="absolute select-none cursor-pointer hover:text-primary hover:scale-110 hover:bg-primary/10 hover:shadow-lg transition-all duration-200 flex items-center justify-center text-sm font-semibold text-foreground rounded-full"
          style={{
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            width: '20px',
            height: '20px',
            transform: 'translate(-50%, -50%)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            const currentTime = formattedValue.split(':').map(Number);
            const minutes = currentTime[1];
            const newHours = actualHour; // Use actual hour value
            
            const newTime = `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            onChange(newTime);
          }}
        >
          {actualHour.toString().padStart(2, '0')}
        </div>
      );
    }
    
    return hours;
  };

  const generateMinuteMarks = () => {
    const marks = [];
    for (let i = 0; i < 60; i += 5) {
      const angle = (i * 6) - 90; // -90 to start at 12 o'clock
      const x = Math.cos(angle * Math.PI / 180) * 60; // Updated to match new outer ring radius
      const y = Math.sin(angle * Math.PI / 180) * 60;
      marks.push(
        <div
          key={i}
          className="absolute text-xs font-medium text-foreground/60 select-none cursor-pointer hover:text-primary hover:bg-primary/10 hover:scale-110 hover:shadow-lg transition-all duration-200 rounded-full flex items-center justify-center"
          style={{
            left: `calc(50% + ${x}px - 6px)`,
            top: `calc(50% + ${y}px - 6px)`,
            width: '12px',
            height: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={(e) => {
            e.stopPropagation();
            const currentTime = formattedValue.split(':').map(Number);
            const hours = currentTime[0];
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
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="00:00"
          className="font-mono text-center bg-background border-border hover:border-accent focus:border-accent focus:ring-accent/20 transition-all duration-200"
        />
      </div>
      
      {/* Professional Modal Overlay */}
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
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 animate-in fade-in-0 zoom-in-95 relative"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Select Time</h2>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Professional 24-Hour Clock Interface */}
                <div className="flex flex-col items-center space-y-4">
                     <div 
                      ref={clockRef}
                      className="relative w-72 h-72 bg-gradient-to-br from-background to-muted/20 rounded-full border-4 border-border/60 hover:border-primary/60 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    >
                     {/* Clock face inner circle */}
                     <div className="absolute inset-4 rounded-full bg-background border-2 border-border/30 shadow-inner transition-all duration-300">
                       {/* Hour numbers or minute marks */}
                       {isSelectingMinutes ? generateMinuteMarks() : generateHourNumbers()}
                       
                        {/* Prominent clock hands */}
                        <div 
                          className="absolute top-1/2 left-1/2 origin-bottom bg-primary/90 rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-300"
                          style={{
                            width: '3px',
                            height: '45px',
                            transform: `translate(-50%, -100%) rotate(${isSelectingMinutes ? minuteAngle : hourAngle}deg)`,
                            transformOrigin: 'bottom center'
                          }}
                        />
                        
                        {/* Minute markers for precision */}
                        {!isSelectingMinutes && (
                          <>
                            {Array.from({ length: 24 }, (_, i) => {
                              const angle = (i * 15) - 90;
                              const radius = 70;
                              const x = Math.cos(angle * Math.PI / 180) * radius;
                              const y = Math.sin(angle * Math.PI / 180) * radius;
                              return (
                                <div
                                  key={`marker-${i}`}
                                  className="absolute w-0.5 h-2 bg-border/60"
                                  style={{
                                    left: `calc(50% + ${x}px)`,
                                    top: `calc(50% + ${y}px)`,
                                    transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`,
                                    transformOrigin: 'center'
                                  }}
                                />
                              );
                            })}
                          </>
                        )}
                        
                        {/* Center dot - enhanced */}
                        <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20 shadow-lg border-2 border-background" />
                     </div>
                   </div>
                  
                   {/* Current time display - directly editable */}
                   <div className="text-center bg-accent/10 rounded-xl p-4 border border-accent/20">
                     <Input
                       type="text"
                       value={inputValue}
                       onChange={handleInputChange}
                       onKeyDown={handleInputKeyDown}
                       className="text-5xl font-mono font-bold text-primary bg-transparent border-none text-center p-0 h-auto focus:ring-0 tracking-wider"
                       placeholder="00:00"
                     />
                     <div className="text-sm text-muted-foreground font-medium mt-2">
                       {isSelectingMinutes ? 'Select minutes' : 'Select hours (24-hour format)'}
                     </div>
                   </div>
                </div>
                
                  {/* Hour/Minute Toggle */}
                  <div className="flex items-center justify-center space-x-2">
                   <Button
                     variant={!isSelectingMinutes ? "default" : "outline"}
                     size="lg"
                     onClick={() => setIsSelectingMinutes(false)}
                     className="min-w-[80px] transition-all duration-200 hover:scale-105 active:scale-95"
                   >
                     Hours
                   </Button>
                   <Button
                     variant={isSelectingMinutes ? "default" : "outline"}
                     size="lg"
                     onClick={() => setIsSelectingMinutes(true)}
                     className="min-w-[80px] transition-all duration-200 hover:scale-105 active:scale-95"
                   >
                     Minutes
                   </Button>
                 </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-6 border-t border-border/40 space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="bg-background hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 min-w-[80px]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // PHASE 3: Simplified close without immediate onChange - let parent handle save
                  onClose();
                }}
                className="bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95 min-w-[80px]"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};