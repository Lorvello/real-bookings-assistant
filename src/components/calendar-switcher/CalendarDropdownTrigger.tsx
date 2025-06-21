
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import type { Calendar } from '@/types/database';

interface CalendarDropdownTriggerProps {
  selectedCalendar: Calendar | null;
}

export function CalendarDropdownTrigger({ selectedCalendar }: CalendarDropdownTriggerProps) {
  return (
    <Button variant="outline" className="justify-between min-w-[250px]">
      <div className="flex items-center space-x-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: selectedCalendar?.color || '#3B82F6' }}
        />
        <span className="truncate">
          {selectedCalendar ? selectedCalendar.name : 'Selecteer kalender'}
        </span>
      </div>
      <ChevronDown className="w-4 h-4 opacity-50" />
    </Button>
  );
}
