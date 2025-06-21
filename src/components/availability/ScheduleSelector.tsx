
import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AvailabilitySchedule } from '@/types/database';

interface ScheduleSelectorProps {
  schedules: AvailabilitySchedule[];
  selectedScheduleId: string;
  onScheduleChange: (scheduleId: string) => void;
}

export function ScheduleSelector({ 
  schedules, 
  selectedScheduleId, 
  onScheduleChange 
}: ScheduleSelectorProps) {
  return (
    <Select value={selectedScheduleId} onValueChange={onScheduleChange}>
      <SelectTrigger className="w-48 bg-input border-border">
        <SelectValue placeholder="Selecteer schema" />
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        {schedules.map((schedule) => (
          <SelectItem key={schedule.id} value={schedule.id}>
            <div className="flex items-center">
              {schedule.name}
              {schedule.is_default && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Standaard
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
