
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface TimeSlot {
  start: string;
  end: string;
}

interface DayAvailabilityProps {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  label: string;
  calendarId: string;
}

export function DayAvailability({ day, label, calendarId }: DayAvailabilityProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { start: '09:00', end: '17:00' }
  ]);

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { start: '09:00', end: '17:00' }]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...timeSlots];
    updated[index][field] = value;
    setTimeSlots(updated);
  };

  return (
    <div className="p-4 bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-foreground">{label}</span>
        <Switch 
          checked={isEnabled} 
          onCheckedChange={setIsEnabled}
        />
      </div>
      
      {isEnabled && (
        <div className="space-y-3">
          {timeSlots.map((slot, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="time"
                value={slot.start}
                onChange={(e) => updateTimeSlot(index, 'start', e.target.value)}
                className="px-2 py-1 text-sm border border-border/60 rounded-xl bg-background/50"
              />
              <span className="text-muted-foreground">tot</span>
              <input
                type="time"
                value={slot.end}
                onChange={(e) => updateTimeSlot(index, 'end', e.target.value)}
                className="px-2 py-1 text-sm border border-border/60 rounded-xl bg-background/50"
              />
              {timeSlots.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTimeSlot(index)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={addTimeSlot}
            className="w-full bg-background/50 border-border/60 hover:bg-accent/50"
          >
            <Plus className="h-3 w-3 mr-1" />
            Tijdslot toevoegen
          </Button>
        </div>
      )}
    </div>
  );
}
